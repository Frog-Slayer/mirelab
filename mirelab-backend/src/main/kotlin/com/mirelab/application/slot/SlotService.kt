package com.mirelab.application.slot

import com.mirelab.domain.slot.SlotOwner
import com.mirelab.domain.slot.SlotValue
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
    /** 칸은 그 작품이 속한 스터디 기준. 콜아웃 칸(owner: SESSION)은 그 모임이 이 작품 소관일 때만 */
    fun getWorkSlots(workId: UUID): WorkSlotsResponse? {
        val work = workRepository.findById(workId).orElse(null) ?: return null
        val studyId = work.study?.id ?: return null

        val slots = slotDefRepository.findByStudyIdOrderBySortOrder(studyId)
            .filter { !it.hidden }
            .filter { it.owner == SlotOwner.STUDY || it.session?.work?.id == workId }

        val values = slotValueRepository.findByWorkId(workId)
        return WorkSlotsResponse(slots.map { it.toResponse() }, values.map { it.toResponse() })
    }

    @Transactional
    fun saveValue(workId: UUID, input: SlotValueInput): SlotValueResponse {
        val existing = slotValueRepository.findByWorkIdAndSlotDefIdAndUserId(workId, input.slotDefId, input.userId)
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
