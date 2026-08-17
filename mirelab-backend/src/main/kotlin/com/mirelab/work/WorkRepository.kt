package com.mirelab.work

import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface WorkRepository : JpaRepository<Work, UUID> {
    /** 스터디가 다루는 작품들 (명예의 전당·책장) */
    fun findByStudyId(studyId: UUID): List<Work>

    /** 개인 서재에만 있는 작품들 */
    fun findByOwnerId(ownerId: UUID): List<Work>
}
