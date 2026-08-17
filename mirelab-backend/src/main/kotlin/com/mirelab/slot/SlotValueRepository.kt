package com.mirelab.slot

import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface SlotValueRepository : JpaRepository<SlotValue, UUID> {
    /** 한 작품에 붙은 값 전부 — 칸 화면을 그릴 때 한 번에 가져온다 */
    fun findByWorkId(workId: UUID): List<SlotValue>

    /** 저장(upsert) 시 기존 값이 있는지 찾을 때 쓴다 */
    fun findByWorkIdAndSlotDefIdAndUserId(workId: UUID, slotDefId: UUID, userId: UUID): SlotValue?
}
