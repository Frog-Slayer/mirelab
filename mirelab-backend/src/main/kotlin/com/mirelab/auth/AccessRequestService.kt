package com.mirelab.auth

import com.mirelab.domain.auth.AccessRequest
import com.mirelab.domain.auth.AccessRequestStatus
import com.mirelab.domain.user.Role
import com.mirelab.domain.user.User
import com.mirelab.infra.auth.AccessRequestRepository
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
) {
    /** 등록되지 않은 계정의 로그인 시도 — 신청을 만들거나, 이미 있으면 최신 프로필로 되살린다 */
    @Transactional
    fun record(email: String, googleName: String, pictureUrl: String?) {
        val existing = accessRequestRepository.findByEmail(email)

        if (existing == null) {
            accessRequestRepository.save(
                AccessRequest(email = email, googleName = googleName, pictureUrl = pictureUrl),
            )
            return
        }

        // 승인된 신청인데 여기까지 왔다면 User 가 지워진 것이다 — 다시 대기로 돌려 admin 이 판단한다.
        existing.reopen(googleName, pictureUrl)
    }

    @Transactional(readOnly = true)
    fun pending(): List<AccessRequest> =
        accessRequestRepository.findByStatusOrderByRequestedAtAsc(AccessRequestStatus.PENDING)

    @Transactional(readOnly = true)
    fun countPending(): Int = pending().size

    /**
     * 승인 — 이름·색은 admin 이 정한 값으로 새 [User] 를 만든다. 구글 이름을 그대로 쓰지 않는
     * 이유는 화면 전체가 "영서·호남" 같은 짧은 호칭을 쓰기 때문이다.
     */
    @Transactional
    fun approve(requestId: UUID, name: String, color: String): User {
        val request = accessRequestRepository.findById(requestId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "없는 가입 신청입니다")
        }

        if (userRepository.existsByEmail(request.email)) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "이미 가입된 이메일입니다: ${request.email}")
        }

        val user = userRepository.save(
            User(name = name.trim(), color = color, email = request.email, role = Role.MEMBER),
        )
        request.approve(user)

        return user
    }

    @Transactional
    fun reject(requestId: UUID) {
        val request = accessRequestRepository.findById(requestId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "없는 가입 신청입니다")
        }
        request.reject()
    }
}
