package com.mirelab.application.work

import com.mirelab.application.session.toResponse
import com.mirelab.domain.slot.SlotType
import com.mirelab.domain.slot.SlotValueContext
import com.mirelab.domain.work.Work
import com.mirelab.domain.work.WorkStatus
import com.mirelab.infra.session.SessionRepository
import com.mirelab.infra.slot.SlotDefRepository
import com.mirelab.infra.slot.SlotValueRepository
import com.mirelab.infra.study.StudyRepository
import com.mirelab.infra.user.UserRepository
import com.mirelab.infra.work.WorkBlockRepository
import com.mirelab.infra.work.WorkRepository
import java.time.Year
import java.util.UUID
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class WorkService(
    private val workRepository: WorkRepository,
    private val studyRepository: StudyRepository,
    private val userRepository: UserRepository,
    private val sessionRepository: SessionRepository,
    private val slotDefRepository: SlotDefRepository,
    private val slotValueRepository: SlotValueRepository,
    private val workBlockRepository: WorkBlockRepository,
) {
    /** 완료작만 별점순 — 스터디의 첫 화면 */
    fun hallOfFame(slug: String): List<RankedWorkResponse> {
        val study = studyRepository.findBySlug(slug) ?: return emptyList()
        return workRepository.findByStudyId(study.id!!)
            .filter { it.status == WorkStatus.DONE }
            .map { rank(it, study.id!!) }
            .sortedByDescending { it.average }
    }

    /** 후보·읽는 중까지 포함한 전체 책장 */
    fun library(slug: String): List<LibraryEntryResponse> {
        val study = studyRepository.findBySlug(slug) ?: return emptyList()
        return workRepository.findByStudyId(study.id!!).map { work ->
            val sessionCount = sessionRepository.findByWorkId(work.id!!).size
            rank(work, study.id!!).toLibraryEntry(sessionCount)
        }
    }

    fun getDetail(workId: UUID): WorkDetailResponse? {
        val work = workRepository.findById(workId).orElse(null) ?: return null
        val studyId = work.study?.id ?: return null
        val sessions = sessionRepository.findByWorkId(workId)
            .sortedWith(compareBy(nullsLast()) { it.meetAt })
        return WorkDetailResponse(rank(work, studyId), sessions.map { it.toResponse() })
    }

    @Transactional
    fun create(slug: String, input: CreateWorkRequest): WorkResponse? {
        val study = studyRepository.findBySlug(slug) ?: return null
        val addedBy = input.addedBy?.let { userRepository.findById(it).orElse(null) }
        val work = Work(
            study = study,
            kind = input.kind,
            title = input.title,
            author = input.author,
            year = Year.now().value,
            status = WorkStatus.CANDIDATE,
            addedBy = addedBy,
            reason = input.reason,
            coverUrl = input.coverUrl,
        )
        return workRepository.save(work).toResponse()
    }

    @Transactional
    fun setStatus(workId: UUID, status: WorkStatus): Boolean {
        val work = workRepository.findById(workId).orElse(null) ?: return false
        work.status = status
        workRepository.save(work)
        return true
    }

    /**
     * 후보 상태이고, 모임·별점·함께 쓰는 기록이 없을 때만 지운다 — 화면에서도 막지만
     * 여기서도 막는다. WorkBlock.work 는 cascade 없는 FK 라, 블록을 안 걸러내면
     * workRepository.delete 가 참조 무결성 위반으로 그냥 실패해버린다.
     */
    @Transactional
    fun remove(workId: UUID): Boolean {
        val work = workRepository.findById(workId).orElse(null) ?: return false
        if (work.status != WorkStatus.CANDIDATE) return false
        if (sessionRepository.findByWorkId(workId).isNotEmpty()) return false
        if (hasVotes(work)) return false
        if (workBlockRepository.findByWorkIdOrderByCreatedAt(workId).isNotEmpty()) return false
        workRepository.delete(work)
        return true
    }

    /** 선정 이유는 그 책을 담은 사람만 고칠 수 있다 */
    @Transactional
    fun updateReason(workId: UUID, userId: UUID, reason: String): Boolean {
        val work = workRepository.findById(workId).orElse(null) ?: return false
        if (work.addedBy?.id != userId) return false
        work.reason = reason
        workRepository.save(work)
        return true
    }

    private fun ratingSlotId(studyId: UUID): UUID? =
        slotDefRepository.findByStudyIdOrderBySortOrder(studyId)
            .firstOrNull { it.type == SlotType.RATING && !it.hidden }
            ?.id

    private fun hasVotes(work: Work): Boolean {
        val slotId = ratingSlotId(work.study?.id ?: return false) ?: return false
        return slotValueRepository.findByWorkIdAndContext(work.id!!, SlotValueContext.STUDY)
            .any { it.slotDef.id == slotId && !it.draft }
    }

    // 명예의 전당 순위는 스터디 공식 기록(STUDY)만 센다 — 내 서재 개인 평점은 안 섞인다.
    private fun rank(work: Work, studyId: UUID): RankedWorkResponse {
        val slotId = ratingSlotId(studyId)
        val values = if (slotId != null) {
            slotValueRepository.findByWorkIdAndContext(work.id!!, SlotValueContext.STUDY)
                .filter { it.slotDef.id == slotId && !it.draft }
        } else {
            emptyList()
        }
        val ratings = values.associate { it.user.id.toString() to ((it.value["n"] as? Number)?.toDouble() ?: 0.0) }
        val average = if (ratings.isEmpty()) 0.0 else ratings.values.average()
        return work.toRanked(ratings, average)
    }
}
