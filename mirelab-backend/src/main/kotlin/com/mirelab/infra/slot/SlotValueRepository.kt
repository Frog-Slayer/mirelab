package com.mirelab.infra.slot

import com.mirelab.domain.slot.SlotValue
import com.mirelab.domain.slot.SlotValueContext
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface SlotValueRepository : JpaRepository<SlotValue, UUID> {
    /** 한 작품·한 컨텍스트(스터디 공식 vs 내 서재)에 붙은 값 전부 */
    fun findByWorkIdAndContext(workId: UUID, context: SlotValueContext): List<SlotValue>

    /** 저장(upsert) 시 기존 값이 있는지 찾을 때 쓴다 */
    fun findByWorkIdAndSlotDefIdAndUserIdAndContext(
        workId: UUID,
        slotDefId: UUID,
        userId: UUID,
        context: SlotValueContext,
    ): SlotValue?
}
