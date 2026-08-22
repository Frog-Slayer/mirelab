package com.mirelab.auth

import com.mirelab.domain.auth.AccessRequest
import com.mirelab.domain.auth.AccessRequestStatus
import com.mirelab.domain.user.Role
import com.mirelab.domain.user.User
import com.mirelab.infra.auth.AccessRequestRepository
import com.mirelab.infra.user.ProfilePictureImporter
import com.mirelab.infra.user.UserRepository
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException

/**
 * 가입 신청 접수와 admin 의 승인·거부.
 *
 * 등록 안 된 계정을 그 자리에서 거부하지 않고 신청으로 남기는 이유: 스터디에 새로 들어오는
 * 사람에게 "먼저 로그인해 보라" 고만 하면 되고, admin 이 이메일을 미리 받아 적어둘 필요가 없다.
 */
@Service
class AccessRequestService(
    private val accessRequestRepository: AccessRequestRepository,
    private val userRepository: UserRepository,
    private val refreshTokenService: RefreshTokenService,
    private val profilePictureImporter: ProfilePictureImporter,
) {
    /** 등록되지 않은 계정의 로그인 시도 — 신청을 만들거나, 이미 있으면 최신 프로필로 되살린다 */
    @Transactional
    fun record(email: String, googleName: String, pictureUrl: String?): AccessRequestStatus {
        val existing = accessRequestRepository.findByEmail(email)

        if (existing == null) {
            return accessRequestRepository.save(
                AccessRequest(email = email, googleName = googleName, pictureUrl = pictureUrl),
            ).status
        }

        if (existing.status == AccessRequestStatus.PROFILE_REQUIRED) {
            existing.googleName = googleName
            existing.pictureUrl = pictureUrl
        } else {
            // 승인된 신청인데 여기까지 왔다면 User 가 지워진 것이다. 거부된 신청은 재신청으로 본다.
            existing.reopen(googleName, pictureUrl)
        }

        return existing.status
    }

    @Transactional(readOnly = true)
    fun pending(): List<AccessRequest> =
        accessRequestRepository.findByStatusOrderByRequestedAtAsc(AccessRequestStatus.PENDING)

    @Transactional(readOnly = true)
    fun all(): List<AccessRequest> =
        accessRequestRepository.findAllExcludingGrantedUserRole(Role.ADMIN)

    @Transactional(readOnly = true)
    fun countPending(): Int = pending().size

    @Transactional(readOnly = true)
    fun findProfileRequest(email: String): AccessRequest =
        accessRequestRepository.findByEmail(email)
            ?.takeIf { it.status == AccessRequestStatus.PROFILE_REQUIRED }
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "가입 정보를 입력할 수 없는 신청입니다")

    @Transactional(readOnly = true)
    fun findByEmail(email: String): AccessRequest? = accessRequestRepository.findByEmail(email)

    /** 신청 이력이 없는 기존·시드 계정은 허용하고, 이력이 있으면 APPROVED만 로그인시킨다. */
    @Transactional(readOnly = true)
    fun canLogin(userId: UUID): Boolean {
        val user = userRepository.findById(userId).orElse(null) ?: return false
        val email = user.email ?: return true
        return accessRequestRepository.findByEmail(email)?.status?.let {
            it == AccessRequestStatus.APPROVED
        } ?: true
    }

    /**
     * admin 승인 — 아직 [User] 는 만들지 않고 신청자가 프로필을 입력할 수 있는 상태로 바꾼다.
     */
    @Transactional
    fun approve(requestId: UUID) {
        changeStatus(requestId, AccessRequestStatus.PROFILE_REQUIRED)
    }

    @Transactional(readOnly = true)
    fun profileRequired(requestId: UUID, email: String): AccessRequest {
        val request = find(requestId)
        if (request.email != email || request.status != AccessRequestStatus.PROFILE_REQUIRED) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "가입 정보를 입력할 수 없는 신청입니다")
        }
        return request
    }

    /** 승인받은 신청자가 이름·색을 정하면 이때 계정을 만들고 최종 승인 상태로 바꾼다. */
    @Transactional
    fun completeProfile(requestId: UUID, email: String, name: String, color: String): User {
        val request = profileRequired(requestId, email)
        val trimmedName = name.trim()

        if (trimmedName.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "이름을 입력해 주세요")
        }
        if (color !in ALLOWED_COLORS) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "사용할 수 없는 색입니다")
        }
        val user = userRepository.findByEmail(email)?.also {
            it.name = trimmedName
            it.color = color
        } ?: userRepository.save(
            User(name = trimmedName, color = color, email = email, role = Role.MEMBER),
        )

        // 구글 사진을 기본 프로필 사진으로 깔아준다. 이미 사진이 있는 계정(다시 가입 정보를
        // 입력하는 경우)은 건드리지 않는다 — 본인이 고른 사진을 되돌려놓으면 안 된다.
        if (user.pictureFilename == null) {
            user.pictureFilename = profilePictureImporter.importFrom(request.pictureUrl)
        }

        request.approve(user)

        return user
    }

    @Transactional
    fun reject(requestId: UUID) {
        val request = find(requestId)
        request.reject()
    }

    /** 상태를 내리면 기존 계정은 보존하되 로그인을 막고, APPROVED로 되돌리면 다시 활성화한다. */
    @Transactional
    fun changeStatus(requestId: UUID, status: AccessRequestStatus) {
        val request = find(requestId)
        val user = userRepository.findByEmail(request.email)
        if (
            user?.role == Role.ADMIN &&
            status in setOf(AccessRequestStatus.PENDING, AccessRequestStatus.REJECTED)
        ) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "관리자 계정은 승인 대기나 거절 상태로 바꿀 수 없습니다",
            )
        }

        when (status) {
            AccessRequestStatus.PENDING -> request.markPending()
            AccessRequestStatus.PROFILE_REQUIRED -> request.requestProfile()
            AccessRequestStatus.REJECTED -> request.reject()
            AccessRequestStatus.APPROVED -> request.approve(
                user ?: throw ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "아직 생성된 멤버 계정이 없어 가입 완료로 바꿀 수 없습니다",
                ),
            )
        }

        if (status != AccessRequestStatus.APPROVED) {
            user?.id?.let(refreshTokenService::revoke)
        }
    }

    private fun find(requestId: UUID): AccessRequest =
        accessRequestRepository.findById(requestId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "없는 가입 신청입니다")
        }

    private companion object {
        val ALLOWED_COLORS = setOf(
            "bg-emerald-500",
            "bg-sky-500",
            "bg-amber-500",
            "bg-rose-500",
        )
    }
}
