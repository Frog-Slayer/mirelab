package com.mirelab.application.study

import com.mirelab.application.user.UserResponse
import com.mirelab.application.user.toResponse
import com.mirelab.domain.study.StudyMember
import com.mirelab.domain.user.Role
import com.mirelab.infra.study.StudyMemberRepository
import com.mirelab.infra.study.StudyRepository
import com.mirelab.infra.user.UserRepository
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException

@Service
class StudyService(
    private val studyRepository: StudyRepository,
    private val studyMemberRepository: StudyMemberRepository,
    private val userRepository: UserRepository,
) {
    /** 내가 속한 스터디들 — 헤더의 스터디 전환기에 쓴다 */
    @Transactional(readOnly = true)
    fun findMine(userId: UUID): List<StudyResponse> {
        val user = userRepository.findById(userId).orElse(null) ?: return emptyList()
        val studies = if (user.role == Role.ADMIN) {
            studyRepository.findAll()
        } else {
            studyMemberRepository.findByUserId(userId).map { it.study }
        }
        return studies.map { it.toResponse() }.sortedBy { it.name }
    }

    @Transactional(readOnly = true)
    fun findBySlug(slug: String): StudyResponse? = studyRepository.findBySlug(slug)?.toResponse()

    @Transactional(readOnly = true)
    fun findAll(): List<StudyResponse> = studyRepository.findAll().map { it.toResponse() }.sortedBy { it.name }

    @Transactional(readOnly = true)
    fun studyIdsForUser(userId: UUID): List<UUID> =
        studyMemberRepository.findByUserId(userId).mapNotNull { it.study.id }

    /** 그 스터디에 속한 사람들 — 평점표·서명 등에 쓴다 */
    @Transactional(readOnly = true)
    fun listMembers(slug: String): List<UserResponse> {
        val study = studyRepository.findBySlug(slug) ?: return emptyList()
        val assigned = studyMemberRepository.findByStudyId(study.id!!).map { it.user }
        val admins = userRepository.findAll().filter { it.role == Role.ADMIN }
        return (assigned + admins).distinctBy { it.id }.map { it.toResponse() }
    }

    /** 관리 화면에서 고른 목록을 해당 사용자의 멤버십 전체 상태로 맞춘다. */
    @Transactional
    fun replaceMemberships(userId: UUID, studyIds: Set<UUID>): Boolean {
        val user = userRepository.findById(userId).orElse(null) ?: return false
        val studies = studyRepository.findAllById(studyIds).associateBy { requireNotNull(it.id) }
        if (studies.keys != studyIds) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "존재하지 않는 스터디가 포함되어 있습니다")
        }

        val existing = studyMemberRepository.findByUserId(userId)
        val existingByStudy = existing.associateBy { requireNotNull(it.study.id) }
        studyMemberRepository.deleteAll(existing.filter { it.study.id !in studyIds })
        studyMemberRepository.saveAll(
            studyIds.filterNot { it in existingByStudy }.map { studyId ->
                StudyMember(study = studies.getValue(studyId), user = user)
            },
        )
        return true
    }
}
