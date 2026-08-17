package com.mirelab.application.shelf

import com.mirelab.application.slot.SlotValueResponse
import com.mirelab.application.slot.toResponse
import com.mirelab.application.study.toResponse
import com.mirelab.application.work.WorkResponse
import com.mirelab.application.work.toResponse
import com.mirelab.domain.slot.SlotDef
import com.mirelab.domain.slot.SlotOwner
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
 * 내 서재 — 혼자 읽은 책과 스터디 작품을 합친 개인 관점. 스터디에서 온 책은 그
 * 작품 상세("내 기록" 드로어)와 똑같은 기록(SlotValueContext.STUDY)을 그대로 보여준다 —
 * 스터디 책 <-> 서재 책이 같은 작품이면 기록도 같아야 한다. 개인이 혼자 담은 책만
 * 대응하는 스터디가 없어 SlotValueContext.SHELF 로 별도 저장한다.
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
            val values = valuesFor(work, userId, slotDefIds)
            ShelfEntryResponse(work.toResponse(), work.study?.toResponse(), values.map { it.toResponse() })
        }
        return ShelfResponse(slotDefs.map { it.toResponse() }, entries)
    }

    fun getEntry(userId: UUID, workId: UUID): ShelfDetailResponse? {
        val work = workRepository.findById(workId).orElse(null) ?: return null
        val myStudyIds = myStudyIds(userId)
        if (!isMine(work, userId, myStudyIds)) return null

        val slotDefs = slotDefsFor(work, myStudyIds)
        val slotDefIds = slotDefs.mapNotNull { it.id }.toSet()
        val values = valuesFor(work, userId, slotDefIds)

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

    /** 저장(upsert) — 스터디 책이면 작품 상세와 같은 STUDY 컨텍스트에 쓴다. 개인 책만 SHELF. */
    @Transactional
    fun saveValue(userId: UUID, workId: UUID, input: ShelfSlotValueInput): SlotValueResponse {
        val work = workRepository.findById(workId).orElseThrow()
        val context = contextFor(work)
        val existing = slotValueRepository.findByWorkIdAndSlotDefIdAndUserIdAndContext(
            workId, input.slotDefId, userId, context,
        )
        val entity = if (existing != null) {
            existing.value = input.value
            input.draft?.let { existing.draft = it }
            existing
        } else {
            val slotDef = slotDefRepository.findById(input.slotDefId).orElseThrow()
            val user = userRepository.findById(userId).orElseThrow()
            SlotValue(
                work = work,
                slotDef = slotDef,
                user = user,
                value = input.value,
                draft = input.draft ?: true,
                context = context,
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

    /** 내가 속한 스터디들의 개인 칸 정의 — 목이라 스터디가 여러 개면 전부 합친다. 개인 책의 기록 항목으로 쓴다 */
    private fun personalSlotDefs(myStudyIds: Set<UUID>): List<SlotDef> =
        myStudyIds.flatMap { slotDefRepository.findByStudyIdOrderBySortOrder(it) }.filter { !it.hidden }

    /** 스터디 책이면 그 작품 상세와 똑같이 자기 스터디의 칸만(콜아웃은 이 작품 소관일 때만), 개인 책이면 personalSlotDefs */
    private fun slotDefsFor(work: Work, myStudyIds: Set<UUID>): List<SlotDef> {
        val studyId = work.study?.id ?: return personalSlotDefs(myStudyIds)
        return slotDefRepository.findByStudyIdOrderBySortOrder(studyId)
            .filter { !it.hidden }
            .filter { it.owner == SlotOwner.STUDY || it.session?.work?.id == work.id }
    }

    private fun contextFor(work: Work): SlotValueContext =
        if (work.study != null) SlotValueContext.STUDY else SlotValueContext.SHELF

    private fun valuesFor(work: Work, userId: UUID, slotDefIds: Set<UUID>): List<SlotValue> =
        slotValueRepository.findByWorkIdAndContext(work.id!!, contextFor(work))
            .filter { it.user.id == userId && it.slotDef.id in slotDefIds }
}
