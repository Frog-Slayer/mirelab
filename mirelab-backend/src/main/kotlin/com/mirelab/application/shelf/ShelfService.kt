package com.mirelab.application.shelf

import com.mirelab.application.slot.SlotValueResponse
import com.mirelab.application.slot.toResponse
import com.mirelab.application.study.toResponse
import com.mirelab.application.work.WorkAccessChecker
import com.mirelab.application.work.WorkResponse
import com.mirelab.application.work.toResponse
import com.mirelab.domain.slot.SlotDef
import com.mirelab.domain.slot.SlotOwner
import com.mirelab.domain.slot.SlotValue
import com.mirelab.domain.slot.SlotValueContext
import com.mirelab.domain.slot.SlotType
import com.mirelab.domain.slot.Visibility
import com.mirelab.domain.work.Work
import com.mirelab.domain.work.WorkKind
import com.mirelab.domain.work.WorkStatus
import com.mirelab.infra.slot.SlotDefRepository
import com.mirelab.infra.slot.SlotValueRepository
import com.mirelab.infra.user.UserRepository
import com.mirelab.infra.work.WorkRepository
import java.time.Year
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException

/**
 * 내 서재 — 혼자 읽은 책과 스터디 작품을 합친 개인 관점. 스터디에서 온 책은 그
 * 작품 상세("내 기록" 드로어)와 똑같은 기록(SlotValueContext.STUDY)을 그대로 보여준다 —
 * 스터디 책 <-> 서재 책이 같은 작품이면 기록도 같아야 한다. 개인이 혼자 담은 책만
 * 대응하는 스터디가 없어 SlotValueContext.SHELF 로 별도 저장한다.
 */
@Service
class ShelfService(
    private val workRepository: WorkRepository,
    private val slotDefRepository: SlotDefRepository,
    private val slotValueRepository: SlotValueRepository,
    private val userRepository: UserRepository,
    private val workAccessChecker: WorkAccessChecker,
) {
    @Transactional(readOnly = true)
    fun list(ownerId: UUID, viewerId: UUID = ownerId): ShelfResponse {
        val ownerStudyIds = myStudyIds(ownerId)
        val mine = ownerId == viewerId
        val visibleStudyIds = if (mine) ownerStudyIds else ownerStudyIds intersect myStudyIds(viewerId)
        val works = if (mine) {
            worksFor(ownerId, ownerStudyIds)
        } else {
            visibleStudyIds.flatMap { workRepository.findByStudyId(it) }
                .filter { it.status != WorkStatus.CANDIDATE }
                .distinctBy { it.id }
                .filter { hasPublishedRating(it, ownerId) }
        }
        val allSlotDefs = personalSlotDefs(visibleStudyIds)
        val slotDefs = if (mine) allSlotDefs else allSlotDefs.filter(::canExposeOnPublicShelf)
        val slotDefIds = slotDefs.mapNotNull { it.id }.toSet()

        val entries = works.map { work ->
            val values = valuesFor(work, ownerId, slotDefIds).let { values ->
                if (mine) values else values.filter { it.published }
            }
            ShelfEntryResponse(work.toResponse(), work.study?.toResponse(), values.map { it.toResponse() })
        }
        return ShelfResponse(slotDefs.map { it.toResponse() }, entries)
    }

    /**
     * 개인 책의 상세. 스터디에서 온 책은 여기에 없다 — 그 책의 기록은 스터디 작품 상세의
     * "내 기록" 드로어 한 곳에서만 쓴다. 같은 책에 개인 페이지가 따로 있으면 어느 쪽에
     * 썼는지 사람이 기억해야 하고, 서재에서 눌러 들어간 곳과 스터디에서 눌러 들어간 곳이
     * 달라진다. 서재의 스터디 책은 목록에는 그대로 꽂혀 있고, 누르면 스터디 쪽으로 간다.
     */
    @Transactional(readOnly = true)
    fun getEntry(userId: UUID, workId: UUID): ShelfDetailResponse? {
        val work = workRepository.findById(workId).orElse(null) ?: return null
        if (work.study != null) return null
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
            work.personalBodyJson,
        )
    }

    @Transactional
    fun saveDocument(userId: UUID, workId: UUID, input: ShelfDocumentInput) {
        val work = requirePersonalWork(workId, userId)
        work.personalBodyJson = input.bodyJson
    }

    @Transactional
    fun setStatus(userId: UUID, workId: UUID, status: WorkStatus) {
        requirePersonalWork(workId, userId).moveTo(status)
    }

    private fun requirePersonalWork(workId: UUID, userId: UUID): Work {
        val work = workRepository.findById(workId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "없는 책입니다")
        }
        if (work.study != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "개인 책이 아닙니다")
        }
        if (work.owner?.id != userId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "내 개인 책만 변경할 수 있습니다")
        }
        return work
    }

    @Transactional
    fun addPersonalWork(ownerId: UUID, input: AddPersonalWorkRequest): WorkResponse? {
        val owner = userRepository.findById(ownerId).orElse(null) ?: return null
        val work = Work(
            owner = owner,
            kind = input.kind,
            title = input.title,
            author = input.author,
            year = input.year ?: Year.now().value,
            status = WorkStatus.CANDIDATE,
            coverUrl = input.coverUrl,
            description = input.description,
        )
        return workRepository.save(work).toResponse()
    }

    /**
     * 개인 책의 기록 저장(upsert).
     *
     * 스터디 책은 여기로 못 쓴다 — 쓰는 곳은 스터디 작품 상세 하나뿐이다([getEntry] 참고).
     * 읽는 문([getEntry])만 닫고 쓰는 문을 열어두면, 화면은 없는데 경로만 살아 있는 상태가
     * 된다.
     */
    @Transactional
    fun saveValue(userId: UUID, workId: UUID, input: ShelfSlotValueInput): SlotValueResponse {
        val work = workRepository.findById(workId).orElseThrow()
        if (work.study != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "스터디 작품 상세에서 기록하는 책입니다")
        }
        val myStudyIds = myStudyIds(userId)
        if (!workAccessChecker.canAccess(work, userId, myStudyIds)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "접근할 수 없는 작품입니다")
        }
        val allowedSlotIds = slotDefsFor(work, myStudyIds).mapNotNull { it.id }.toSet()
        if (input.slotDefId !in allowedSlotIds) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "이 작품에서 사용할 수 없는 기록 항목입니다")
        }
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

    private fun myStudyIds(userId: UUID): Set<UUID> = workAccessChecker.myStudyIds(userId)

    /**
     * 내가 속한 스터디들의 작품 + 내가 개인으로 담은 작품.
     *
     * 스터디 작품은 "시작"한 것부터 들어온다. 후보(CANDIDATE)는 아직 다 같이 읽기로 한
     * 책이 아니라 누가 담아둔 제안일 뿐인데, 그게 곧바로 내 서재에 꽂히면 서재가 "내가
     * 읽은 것"이 아니라 "스터디 후보 목록"이 된다. 시작하는 순간([SessionService.addForWork]
     * 이 CANDIDATE -> READING 으로 옮긴다)이 내 책이 되는 지점이다.
     *
     * 개인 책은 후보 상태로 담기지만([addPersonalWork]) 소유권으로 따로 합치므로 그대로 보인다.
     */
    private fun worksFor(userId: UUID, myStudyIds: Set<UUID>): List<Work> {
        val studyWorks = myStudyIds
            .flatMap { workRepository.findByStudyId(it) }
            .filter { it.status != WorkStatus.CANDIDATE }
        val ownWorks = workRepository.findByOwnerId(userId)
        return (studyWorks + ownWorks).distinctBy { it.id }
    }

    private fun isMine(work: Work, userId: UUID, myStudyIds: Set<UUID>): Boolean =
        workAccessChecker.canAccess(work, userId, myStudyIds)

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

    private fun hasPublishedRating(work: Work, ownerId: UUID): Boolean =
        slotValueRepository.findByWorkIdAndContext(requireNotNull(work.id), contextFor(work)).any {
            it.user.id == ownerId && it.slotDef.type == SlotType.RATING && it.published
        }

    /** 공개 평가 묶음은 별점과 공개 한줄평뿐이다. PRIVATE 메모는 값뿐 아니라 정의도 내리지 않는다. */
    private fun canExposeOnPublicShelf(slot: SlotDef): Boolean =
        slot.type == SlotType.RATING || (slot.type == SlotType.TEXT_SHORT && slot.visibility != Visibility.PRIVATE)
}
