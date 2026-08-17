package com.mirelab.application.shelf

import com.mirelab.application.slot.SlotValueResponse
import com.mirelab.application.slot.toResponse
import com.mirelab.application.study.toResponse
import com.mirelab.application.work.WorkResponse
import com.mirelab.application.work.toResponse
import com.mirelab.domain.slot.SlotDef
import com.mirelab.domain.slot.SlotValue
import com.mirelab.domain.slot.SlotValueContext
import com.mirelab.domain.work.Work
import com.mirelab.domain.work.WorkKind
import com.mirelab.domain.work.WorkStatus
import com.mirelab.infra.slot.SlotDefRepository
import com.mirelab.infra.slot.SlotValueRepository
import com.mirelab.infra.study.StudyMemberRepository
import com.mirelab.infra.user.UserRepository
import com.mirelab.infra.work.WorkRepository
import java.time.Year
import java.util.UUID
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 내 서재 — 혼자 읽은 책과 스터디 작품을 합친 개인 관점. 스터디에서 온 책도
 * 여기 기록은 스터디 쪽 작품 상세와 별개다(SlotValueContext.SHELF 로 구분).
 */
@Service
class ShelfService(
    private val workRepository: WorkRepository,
    private val studyMemberRepository: StudyMemberRepository,
    private val slotDefRepository: SlotDefRepository,
    private val slotValueRepository: SlotValueRepository,
    private val userRepository: UserRepository,
) {
    fun list(userId: UUID): ShelfResponse {
        val myStudyIds = myStudyIds(userId)
        val works = worksFor(userId, myStudyIds)
        val slotDefs = personalSlotDefs(myStudyIds)
        val slotDefIds = slotDefs.mapNotNull { it.id }.toSet()

        val entries = works.map { work ->
            val values = shelfValues(work.id!!, userId, slotDefIds)
            ShelfEntryResponse(work.toResponse(), work.study?.toResponse(), values.map { it.toResponse() })
        }
        return ShelfResponse(slotDefs.map { it.toResponse() }, entries)
    }

    fun getEntry(userId: UUID, workId: UUID): ShelfDetailResponse? {
        val work = workRepository.findById(workId).orElse(null) ?: return null
        val myStudyIds = myStudyIds(userId)
        if (!isMine(work, userId, myStudyIds)) return null

        val slotDefs = personalSlotDefs(myStudyIds)
        val slotDefIds = slotDefs.mapNotNull { it.id }.toSet()
        val values = shelfValues(workId, userId, slotDefIds)

        return ShelfDetailResponse(
            work.toResponse(),
            work.study?.toResponse(),
            slotDefs.map { it.toResponse() },
            values.map { it.toResponse() },
        )
    }

    @Transactional
    fun addPersonalWork(ownerId: UUID, input: AddPersonalWorkRequest): WorkResponse? {
        val owner = userRepository.findById(ownerId).orElse(null) ?: return null
        val work = Work(
            owner = owner,
            kind = input.kind,
            title = input.title,
            author = input.author,
            year = Year.now().value,
            status = WorkStatus.READING,
        )
        return workRepository.save(work).toResponse()
    }

    /** 저장(upsert) — 스터디 쪽과 같은 (work, slotDef, user) 라도 SHELF 컨텍스트라 안 겹친다 */
    @Transactional
    fun saveValue(userId: UUID, workId: UUID, input: ShelfSlotValueInput): SlotValueResponse {
        val existing = slotValueRepository.findByWorkIdAndSlotDefIdAndUserIdAndContext(
            workId, input.slotDefId, userId, SlotValueContext.SHELF,
        )
        val entity = if (existing != null) {
            existing.value = input.value
            input.draft?.let { existing.draft = it }
            existing
        } else {
            val work = workRepository.findById(workId).orElseThrow()
            val slotDef = slotDefRepository.findById(input.slotDefId).orElseThrow()
            val user = userRepository.findById(userId).orElseThrow()
            SlotValue(
                work = work,
                slotDef = slotDef,
                user = user,
                value = input.value,
                draft = input.draft ?: true,
                context = SlotValueContext.SHELF,
            )
        }
        return slotValueRepository.save(entity).toResponse()
    }

    private fun myStudyIds(userId: UUID): Set<UUID> =
        studyMemberRepository.findByUserId(userId).map { it.study.id!! }.toSet()

    /** 내가 속한 스터디들의 작품 + 내가 개인으로 담은 작품 */
    private fun worksFor(userId: UUID, myStudyIds: Set<UUID>): List<Work> {
        val studyWorks = myStudyIds.flatMap { workRepository.findByStudyId(it) }
        val ownWorks = workRepository.findByOwnerId(userId)
        return (studyWorks + ownWorks).distinctBy { it.id }
    }

    private fun isMine(work: Work, userId: UUID, myStudyIds: Set<UUID>): Boolean =
        work.owner?.id == userId || (work.study?.id != null && work.study!!.id in myStudyIds)

    /** 내가 속한 스터디들의 개인 칸 정의 — 목이라 스터디가 여러 개면 전부 합친다 */
    private fun personalSlotDefs(myStudyIds: Set<UUID>): List<SlotDef> =
        myStudyIds.flatMap { slotDefRepository.findByStudyIdOrderBySortOrder(it) }.filter { !it.hidden }

    private fun shelfValues(workId: UUID, userId: UUID, slotDefIds: Set<UUID>): List<SlotValue> =
        slotValueRepository.findByWorkIdAndContext(workId, SlotValueContext.SHELF)
            .filter { it.user.id == userId && it.slotDef.id in slotDefIds }
}
