package com.mirelab.infra.study

import com.mirelab.domain.study.StudyMember
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface StudyMemberRepository : JpaRepository<StudyMember, UUID> {
    /** 내가 속한 스터디들 */
    fun findByUserId(userId: UUID): List<StudyMember>

    /** 그 스터디에 속한 사람들 */
    fun findByStudyId(studyId: UUID): List<StudyMember>

    fun existsByStudyIdAndUserId(studyId: UUID, userId: UUID): Boolean
}
