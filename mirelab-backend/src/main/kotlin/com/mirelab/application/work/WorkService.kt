package com.mirelab.application.work

import com.mirelab.application.session.toResponse
import com.mirelab.domain.slot.SlotType
import com.mirelab.domain.slot.SlotValue
import com.mirelab.domain.slot.SlotValueContext
import com.mirelab.domain.slot.Visibility
import com.mirelab.domain.user.Role
import com.mirelab.domain.work.Work
import com.mirelab.domain.work.WorkStatus
import com.mirelab.infra.note.WorkNoteRepository
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
    private val workNoteRepository: WorkNoteRepository,
) {
    /** 완료작만 별점순 — 스터디의 첫 화면 */
    @Transactional(readOnly = true)
    fun hallOfFame(slug: String): List<RankedWorkResponse> {
        val study = studyRepository.findBySlug(slug) ?: return emptyList()
        val studyId = requireNotNull(study.id)
        val memberIds = effectiveMemberIds(studyId)
        val works = workRepository.findByStudyId(studyId).filter { it.status == WorkStatus.DONE }
        val valuesByWorkId = ratingValuesByWorkId(studyId, works)
        return works
            .map { rank(it, memberIds, valuesByWorkId[it.id] ?: emptyList()) }
            .sortedByDescending { it.average }
    }

    /** 후보·읽는 중까지 포함한 전체 책장 */
    @Transactional(readOnly = true)
    fun library(slug: String): List<LibraryEntryResponse> {
        val study = studyRepository.findBySlug(slug) ?: return emptyList()
        val studyId = requireNotNull(study.id)
        val memberIds = effectiveMemberIds(studyId)
        val works = workRepository.findByStudyId(studyId)
        val valuesByWorkId = ratingValuesByWorkId(studyId, works)
        val workIds = works.mapNotNull { it.id }
        val sessionCountByWorkId = sessionRepository.findByWorkIdIn(workIds)
            .groupingBy { it.work?.id }
            .eachCount()
        return works.map { work ->
            val sessionCount = sessionCountByWorkId[work.id] ?: 0
            rank(work, memberIds, valuesByWorkId[work.id] ?: emptyList()).toLibraryEntry(sessionCount)
        }
    }

    /**
     * 스터디에 공개된 한줄평 전부 — 홈에서 그중 하나를 뽑아 보여준다.
     *
     * 어느 칸이 별점이고 어느 칸이 한줄평이냐는 규칙은
     * [com.mirelab.application.slot.SlotService.ratingBundleIds] 와 같아야 한다. 한쪽만
     * 바뀌면 작품 상세에서는 한 덩어리인 평가가 여기서는 다르게 잘린다.
     *
     * 별점과 한줄평은 같은 값 테이블에 사람·작품별로 따로 들어 있으므로, 작품 전체의 값을
     * 한 번에 읽어(N+1 방지) 사람+작품 단위로 다시 짝지어 준다. 별점 없이 한줄평만 있는
     * 경우는 화면이 별점을 함께 보여주므로 뺀다.
     */
    @Transactional(readOnly = true)
    fun blurbs(slug: String): List<BlurbResponse> {
        val study = studyRepository.findBySlug(slug) ?: return emptyList()
        val studyId = requireNotNull(study.id)
        val slots = slotDefRepository.findByStudyIdOrderBySortOrder(studyId).filter { !it.hidden }
        val ratingSlotId = slots.firstOrNull { it.type == SlotType.RATING }?.id ?: return emptyList()
        val blurbSlotId = slots
            .firstOrNull { it.type == SlotType.TEXT_SHORT && it.visibility != Visibility.PRIVATE }
            ?.id
            ?: return emptyList()

        val memberIds = effectiveMemberIds(studyId)
        val works = workRepository.findByStudyId(studyId)
        val workById = works.associateBy { requireNotNull(it.id) }
        val workIds = works.mapNotNull { it.id }
        if (workIds.isEmpty()) return emptyList()

        // 공개된 값만 — 비공개 평가는 남에게 보이지 않는 게 평가 다이얼로그의 약속이다.
        val published = slotValueRepository.findByWorkIdInAndContext(workIds, SlotValueContext.STUDY)
            .filter { !it.draft && it.published && it.user.id?.let(memberIds::contains) == true }

        val ratingValues = published.filter { it.slotDef.id == ratingSlotId }
        val ratingByKey = ratingValues
            .associateBy { requireNotNull(it.work.id) to requireNotNull(it.user.id) }

        // 그 작품의 공개 평균까지 여기서 함께 낸다 — 화면이 작품 목록을 따로 들고 있다가
        // 붙이게 하면, 그 목록을 안 쓰는 화면으로 바뀌는 순간 조용히 빈칸이 된다.
        val averageByWorkId = ratingValues
            .groupBy { requireNotNull(it.work.id) }
            .mapValues { (_, values) ->
                val scores = values.mapNotNull { (it.value["n"] as? Number)?.toDouble() }
                if (scores.isEmpty()) 0.0 else scores.average()
            }

        return published
            .filter { it.slotDef.id == blurbSlotId }
            .mapNotNull { value ->
                val text = (value.value["text"] as? String)?.trim()
                if (text.isNullOrEmpty()) return@mapNotNull null

                val workId = requireNotNull(value.work.id)
                val userId = requireNotNull(value.user.id)
                val work = workById[workId] ?: return@mapNotNull null
                val rating = ratingByKey[workId to userId]
                    ?.let { (it.value["n"] as? Number)?.toDouble() }
                    ?: return@mapNotNull null

                BlurbResponse(
                    workId = workId,
                    userId = userId,
                    kind = work.kind,
                    title = work.title,
                    author = work.author,
                    coverUrl = work.coverUrl,
                    rating = rating,
                    average = averageByWorkId[workId] ?: 0.0,
                    text = text,
                )
            }
    }

    @Transactional(readOnly = true)
    fun getDetail(workId: UUID, viewerId: UUID): WorkDetailResponse? {
        val work = workRepository.findById(workId).orElse(null) ?: return null
        val studyId = work.study?.id ?: return null
        val sessions = sessionRepository.findByWorkId(workId)
            .sortedWith(compareBy(nullsLast()) { it.meetAt })
        return WorkDetailResponse(
            rank(work, effectiveMemberIds(studyId), ratingValues(studyId, workId), viewerId),
            sessions.map { it.toResponse() },
        )
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
        // 상태와 "그 상태로 들어온 시각"은 늘 같이 움직여야 한다 — status 만 따로 넣으면
        // 목록 정렬이 옛 날짜를 계속 본다([Work.moveTo] 참고).
        work.moveTo(status)
        workRepository.save(work)
        return true
    }

    /**
     * 삭제는 항상 허용한다 — 확인은 프론트에서 삭제 문구 입력으로 이미 걸러진다.
     * WorkBlock/WorkNote/SlotValue 는 cascade 없는 NOT NULL FK 라 먼저 안 지우면 참조 무결성
     * 위반으로 실패하므로, 자식부터 순서대로 지운 뒤 Work 를 지운다.
     */
    @Transactional
    fun remove(workId: UUID): Boolean {
        val work = workRepository.findById(workId).orElse(null) ?: return false
        workBlockRepository.deleteAll(workBlockRepository.findByWorkIdOrderByCreatedAt(workId))
        workNoteRepository.deleteByWorkId(workId)
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

    /** 평점 칸은 스터디마다 하나뿐이라 studyId 당 한 번만 찾으면 된다 */
    private fun ratingSlotId(studyId: UUID): UUID? =
        slotDefRepository.findByStudyIdOrderBySortOrder(studyId)
            .firstOrNull { it.type == SlotType.RATING && !it.hidden }
            ?.id

    // 명예의 전당 순위는 스터디 공식 기록(STUDY)만 센다 — 내 서재 개인 평점은 안 섞인다.
    private fun effectiveMemberIds(studyId: UUID): Set<UUID> =
        studyMemberRepository.findByStudyId(studyId).mapNotNullTo(mutableSetOf()) { it.user.id }.apply {
            addAll(userRepository.findAllByRole(Role.ADMIN).mapNotNull { it.id })
        }

    /** 책 하나의 평점 값 — [getDetail] 처럼 한 권만 볼 때 */
    private fun ratingValues(studyId: UUID, workId: UUID): List<SlotValue> {
        val slotId = ratingSlotId(studyId) ?: return emptyList()
        return slotValueRepository.findByWorkIdAndContext(workId, SlotValueContext.STUDY)
            .filter { it.slotDef.id == slotId && !it.draft }
    }

    /**
     * 여러 책의 평점 값을 한 번의 쿼리로 모아 책 id 별로 나눈다 — 명예의 전당·책장은
     * 책마다 이 값이 필요한데, 책 수만큼 쿼리를 반복하면(N+1) 책이 늘수록 느려진다.
     */
    private fun ratingValuesByWorkId(studyId: UUID, works: List<Work>): Map<UUID, List<SlotValue>> {
        val slotId = ratingSlotId(studyId) ?: return emptyMap()
        val workIds = works.mapNotNull { it.id }
        if (workIds.isEmpty()) return emptyMap()
        return slotValueRepository.findByWorkIdInAndContext(workIds, SlotValueContext.STUDY)
            .filter { it.slotDef.id == slotId && !it.draft }
            .groupBy { requireNotNull(it.work.id) }
    }

    private fun rank(
        work: Work,
        memberIds: Set<UUID>,
        values: List<SlotValue>,
        viewerId: UUID? = null,
    ): RankedWorkResponse {
        val memberValues = values.filter { it.user.id?.let(memberIds::contains) == true }
        val publishedValues = memberValues.filter { it.published }
        val visibleValues = memberValues.filter { it.published || it.user.id == viewerId }
        val ratings = visibleValues.associate {
            it.user.id.toString() to ((it.value["n"] as? Number)?.toDouble() ?: 0.0)
        }
        val publishedRatings = publishedValues.associate {
            it.user.id.toString() to ((it.value["n"] as? Number)?.toDouble() ?: 0.0)
        }
        val average = if (publishedRatings.isEmpty()) 0.0 else publishedRatings.values.average()
        val ratedUserIds = memberValues.mapTo(mutableSetOf()) { it.user.id.toString() }
        return work.toRanked(ratings, publishedRatings.keys, ratedUserIds, average)
    }
}
