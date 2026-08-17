package com.mirelab.application.slot

import com.mirelab.domain.slot.SlotDef
import com.mirelab.domain.slot.SlotOwner
import com.mirelab.domain.slot.SlotValue
import com.mirelab.domain.slot.SlotValueContext
import com.mirelab.domain.slot.Visibility
import com.mirelab.infra.slot.SlotDefRepository
import com.mirelab.infra.slot.SlotValueRepository
import com.mirelab.infra.user.UserRepository
import com.mirelab.infra.work.WorkRepository
import java.util.UUID
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class SlotService(
    private val slotDefRepository: SlotDefRepository,
    private val slotValueRepository: SlotValueRepository,
    private val workRepository: WorkRepository,
    private val userRepository: UserRepository,
) {
    /**
     * 칸은 그 작품이 속한 스터디 기준. 콜아웃 칸(owner: SESSION)은 그 모임이 이 작품 소관일 때만.
     * 작품 상세는 스터디 공식 기록(STUDY)만 보여준다 — 내 서재 개인 기록은 별도 화면·API 몫이다.
     *
     * 값은 칸의 visibility 로 걸러서 내려준다 — PRIVATE 는 본인 값만, AFTER_DEADLINE 은
     * 그 칸이 걸린 모임(session)이 닫혔을 때만 남 것도 보여준다. 콜아웃이 아닌 칸(session
     * 없음)에 AFTER_DEADLINE 이 붙는 경우는 아직 없어서, 그때는 안전하게 본인 값만 준다.
     */
    fun getWorkSlots(workId: UUID, viewerId: UUID): WorkSlotsResponse? {
        val work = workRepository.findById(workId).orElse(null) ?: return null
        val studyId = work.study?.id ?: return null

        val slots = slotDefRepository.findByStudyIdOrderBySortOrder(studyId)
            .filter { !it.hidden }
            .filter { it.owner == SlotOwner.STUDY || it.session?.work?.id == workId }
        val slotById = slots.associateBy { it.id }

        val values = slotValueRepository.findByWorkIdAndContext(workId, SlotValueContext.STUDY)
            .filter { value -> value.user.id == viewerId || canSee(slotById[value.slotDef.id]) }
        return WorkSlotsResponse(slots.map { it.toResponse() }, values.map { it.toResponse() })
    }

    private fun canSee(slot: SlotDef?): Boolean = when (slot?.visibility) {
        Visibility.ALWAYS -> true
        Visibility.AFTER_DEADLINE -> slot.session?.closed == true
        Visibility.PRIVATE, null -> false
    }

    @Transactional
    fun saveValue(workId: UUID, input: SlotValueInput): SlotValueResponse {
        val existing = slotValueRepository.findByWorkIdAndSlotDefIdAndUserIdAndContext(
            workId,
            input.slotDefId,
            input.userId,
            SlotValueContext.STUDY,
        )
        val entity = if (existing != null) {
            existing.value = input.value
            input.draft?.let { existing.draft = it }
            existing
        } else {
            val work = workRepository.findById(workId).orElseThrow()
            val slotDef = slotDefRepository.findById(input.slotDefId).orElseThrow()
            val user = userRepository.findById(input.userId).orElseThrow()
            SlotValue(work = work, slotDef = slotDef, user = user, value = input.value, draft = input.draft ?: true)
        }
        return slotValueRepository.save(entity).toResponse()
    }
}

data class SlotValueInput(
    val slotDefId: UUID,
    val userId: UUID,
    val value: Map<String, Any?>,
    val draft: Boolean?,
)
