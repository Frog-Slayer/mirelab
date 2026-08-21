package com.mirelab.application.work

import com.mirelab.application.session.toResponse
import com.mirelab.domain.slot.SlotType
import com.mirelab.domain.slot.SlotValueContext
import com.mirelab.domain.user.Role
import com.mirelab.domain.work.Work
import com.mirelab.domain.work.WorkStatus
import com.mirelab.infra.session.SessionRepository
import com.mirelab.infra.slot.SlotDefRepository
import com.mirelab.infra.slot.SlotValueRepository
import com.mirelab.infra.study.StudyMemberRepository
import com.mirelab.infra.study.StudyRepository
import com.mirelab.infra.user.UserRepository
import com.mirelab.infra.work.WorkBlockRepository
import com.mirelab.infra.work.WorkRepository
import java.time.Year
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException

@Service
class WorkService(
    private val workRepository: WorkRepository,
    private val studyRepository: StudyRepository,
    private val studyMemberRepository: StudyMemberRepository,
    private val userRepository: UserRepository,
    private val sessionRepository: SessionRepository,
    private val slotDefRepository: SlotDefRepository,
    private val slotValueRepository: SlotValueRepository,
    private val workBlockRepository: WorkBlockRepository,
) {
    /** 완료작만 별점순 — 스터디의 첫 화면 */
    fun hallOfFame(slug: String): List<RankedWorkResponse> {
        val study = studyRepository.findBySlug(slug) ?: return emptyList()
        val memberIds = effectiveMemberIds(requireNotNull(study.id))
        return workRepository.findByStudyId(study.id!!)
            .filter { it.status == WorkStatus.DONE }
            .map { rank(it, study.id!!, memberIds) }
            .sortedByDescending { it.average }
    }

    /** 후보·읽는 중까지 포함한 전체 책장 */
    fun library(slug: String): List<LibraryEntryResponse> {
        val study = studyRepository.findBySlug(slug) ?: return emptyList()
        val memberIds = effectiveMemberIds(requireNotNull(study.id))
        return workRepository.findByStudyId(study.id!!).map { work ->
            val sessionCount = sessionRepository.findByWorkId(work.id!!).size
            rank(work, study.id!!, memberIds).toLibraryEntry(sessionCount)
        }
    }

    fun getDetail(workId: UUID): WorkDetailResponse? {
        val work = workRepository.findById(workId).orElse(null) ?: return null
        val studyId = work.study?.id ?: return null
        val sessions = sessionRepository.findByWorkId(workId)
            .sortedWith(compareBy(nullsLast()) { it.meetAt })
        return WorkDetailResponse(rank(work, studyId, effectiveMemberIds(studyId)), sessions.map { it.toResponse() })
    }

    @Transactional
    fun create(slug: String, addedById: UUID, input: CreateWorkRequest): WorkResponse? {
        val study = studyRepository.findBySlug(slug) ?: return null
        val addedBy = userRepository.findById(addedById).orElse(null)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인 사용자를 찾을 수 없습니다")
        if (
            addedBy.role != Role.ADMIN &&
            !studyMemberRepository.existsByStudyIdAndUserId(requireNotNull(study.id), addedById)
        ) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "이 스터디의 멤버만 책을 추가할 수 있습니다")
        }
        val work = Work(
            study = study,
            kind = input.kind,
            title = input.title,
            author = input.author,
            year = input.year ?: Year.now().value,
            status = WorkStatus.CANDIDATE,
            addedBy = addedBy,
            reason = input.reason,
            coverUrl = input.coverUrl,
            description = input.description,
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
     * 삭제는 항상 허용한다 — 확인은 프론트에서 삭제 문구 입력으로 이미 걸러진다.
     * WorkBlock/SlotValue 는 cascade 없는 NOT NULL FK 라 먼저 안 지우면 참조 무결성
     * 위반으로 실패하므로, 자식부터 순서대로 지운 뒤 Work 를 지운다.
     */
    @Transactional
    fun remove(workId: UUID): Boolean {
        val work = workRepository.findById(workId).orElse(null) ?: return false
        workBlockRepository.deleteAll(workBlockRepository.findByWorkIdOrderByCreatedAt(workId))
        slotValueRepository.deleteByWorkId(workId)
        val sessions = sessionRepository.findByWorkId(workId)
        val sessionIds = sessions.mapNotNull { it.id }
        // 회차 전용 콜아웃 칸(owner=SESSION)이 이 회차를 참조하고 있으면, session_id 가
        // NOT NULL 은 아니지만 그대로 두면 FK 위반으로 회차 삭제가 실패한다 — 먼저 떼어낸다.
        // 칸 정의는 지우지 않고 숨기는 게 이 프로젝트의 컨벤션이라(과거 기록 보존), 여기서도
        // 지우는 대신 session 을 null 로 돌리고 hidden 처리한다.
        if (sessionIds.isNotEmpty()) {
            val danglingSlotDefs = slotDefRepository.findBySessionIdIn(sessionIds)
            danglingSlotDefs.forEach {
                it.session = null
                it.hidden = true
            }
            slotDefRepository.saveAll(danglingSlotDefs)
        }
        sessionRepository.deleteAll(sessions)
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

    /** 제목·저자·줄거리·표지는 서지 정보 교정이라 선정 이유와 달리 아무나 고칠 수 있다 */
    @Transactional
    fun updateInfo(workId: UUID, input: UpdateWorkInfoRequest): Boolean {
        val work = workRepository.findById(workId).orElse(null) ?: return false
        work.title = input.title
        work.author = input.author
        work.description = input.description
        work.coverUrl = input.coverUrl
        input.year?.let { work.year = it }
        workRepository.save(work)
        return true
    }

    private fun ratingSlotId(studyId: UUID): UUID? =
        slotDefRepository.findByStudyIdOrderBySortOrder(studyId)
            .firstOrNull { it.type == SlotType.RATING && !it.hidden }
            ?.id

    // 명예의 전당 순위는 스터디 공식 기록(STUDY)만 센다 — 내 서재 개인 평점은 안 섞인다.
    private fun effectiveMemberIds(studyId: UUID): Set<UUID> =
        studyMemberRepository.findByStudyId(studyId).mapNotNullTo(mutableSetOf()) { it.user.id }.apply {
            addAll(userRepository.findAllByRole(Role.ADMIN).mapNotNull { it.id })
        }

    private fun rank(work: Work, studyId: UUID, memberIds: Set<UUID>): RankedWorkResponse {
        val slotId = ratingSlotId(studyId)
        val values = if (slotId != null) {
            slotValueRepository.findByWorkIdAndContext(work.id!!, SlotValueContext.STUDY)
                .filter {
                    it.slotDef.id == slotId &&
                        !it.draft &&
                        it.user.id?.let(memberIds::contains) == true
                }
        } else {
            emptyList()
        }
        val ratings = values.associate { it.user.id.toString() to ((it.value["n"] as? Number)?.toDouble() ?: 0.0) }
        val average = if (ratings.isEmpty()) 0.0 else ratings.values.average()
        return work.toRanked(ratings, average)
    }
}
