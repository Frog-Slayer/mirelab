package com.mirelab.infra.slot

import com.mirelab.domain.slot.SlotDef
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface SlotDefRepository : JpaRepository<SlotDef, UUID> {
    /** 작품 화면에 그려지는 순서대로 */
    fun findByStudyIdOrderBySortOrder(studyId: UUID): List<SlotDef>

    /** 회차 전용 콜아웃 칸(owner=SESSION) — 그 회차를 지우기 전에 먼저 떼어내야 한다 */
    fun findBySessionIdIn(sessionIds: List<UUID>): List<SlotDef>
}
