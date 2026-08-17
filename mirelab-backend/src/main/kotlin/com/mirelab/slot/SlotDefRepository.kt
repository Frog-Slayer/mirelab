package com.mirelab.slot

import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface SlotDefRepository : JpaRepository<SlotDef, UUID> {
    /** 작품 화면에 그려지는 순서대로 */
    fun findByStudyIdOrderBySortOrder(studyId: UUID): List<SlotDef>
}
