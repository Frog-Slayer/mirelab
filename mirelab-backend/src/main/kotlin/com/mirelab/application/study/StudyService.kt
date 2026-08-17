package com.mirelab.application.study

import com.mirelab.application.user.UserResponse
import com.mirelab.application.user.toResponse
import com.mirelab.infra.study.StudyMemberRepository
import com.mirelab.infra.study.StudyRepository
import java.util.UUID
import org.springframework.stereotype.Service

@Service
class StudyService(
    private val studyRepository: StudyRepository,
    private val studyMemberRepository: StudyMemberRepository,
) {
    /** 내가 속한 스터디들 — 헤더의 스터디 전환기에 쓴다 */
    fun findMine(userId: UUID): List<StudyResponse> =
        studyMemberRepository.findByUserId(userId).map { it.study.toResponse() }

    fun findBySlug(slug: String): StudyResponse? = studyRepository.findBySlug(slug)?.toResponse()

    /** 그 스터디에 속한 사람들 — 평점표·서명 등에 쓴다 */
    fun listMembers(slug: String): List<UserResponse> {
        val study = studyRepository.findBySlug(slug) ?: return emptyList()
        return studyMemberRepository.findByStudyId(study.id!!).map { it.user.toResponse() }
    }
}
