package com.mirelab.application.work

import com.mirelab.application.session.toResponse
import com.mirelab.domain.rating.WorkRating
import com.mirelab.domain.user.Role
import com.mirelab.domain.work.Work
import com.mirelab.domain.work.WorkStatus
import com.mirelab.infra.note.WorkNoteRepository
import com.mirelab.infra.rating.WorkRatingRepository
import com.mirelab.infra.session.SessionRepository
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
    private val workRatingRepository: WorkRatingRepository,
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
        val ratingsByWorkId = ratingsByWorkId(works)
        return works
            .map { rank(it, memberIds, ratingsByWorkId[it.id] ?: emptyList()) }
            .sortedByDescending { it.average }
    }

    /** 후보·읽는 중까지 포함한 전체 책장 */
    @Transactional(readOnly = true)
    fun library(slug: String): List<LibraryEntryResponse> {
        val study = studyRepository.findBySlug(slug) ?: return emptyList()
        val studyId = requireNotNull(study.id)
        val memberIds = effectiveMemberIds(studyId)
        val works = workRepository.findByStudyId(studyId)
        val ratingsByWorkId = ratingsByWorkId(works)
        val workIds = works.mapNotNull { it.id }
        val sessionCountByWorkId = sessionRepository.findByWorkIdIn(workIds)
            .groupingBy { it.work?.id }
            .eachCount()
        return works.map { work ->
            val sessionCount = sessionCountByWorkId[work.id] ?: 0
            rank(work, memberIds, ratingsByWorkId[work.id] ?: emptyList()).toLibraryEntry(sessionCount)
        }
    }

    /**
     * 스터디에 공개된 한줄평 전부 — 홈에서 그중 하나를 뽑아 보여준다.
     *
     * 별점 없이 한줄평만 있는 경우는 뺀다 — 화면이 둘을 같이 보여주기 때문이다.
     * 예전에는 별점과 한줄평이 범용 칸 테이블에 따로 들어 있어서 여기서 사람+작품 단위로
     * 다시 짝지어야 했고, "어느 칸이 한줄평인가" 규칙까지 이 함수가 알아야 했다. 지금은
     * 한 행이라 짝지을 것도, 규칙도 없다.
     */
    @Transactional(readOnly = true)
    fun blurbs(slug: String): List<BlurbResponse> {
        val study = studyRepository.findBySlug(slug) ?: return emptyList()
        val studyId = requireNotNull(study.id)

        val memberIds = effectiveMemberIds(studyId)
        val works = workRepository.findByStudyId(studyId)
        val workById = works.associateBy { requireNotNull(it.id) }
        val workIds = works.mapNotNull { it.id }
        if (workIds.isEmpty()) return emptyList()

        // 공개된 것만 — 비공개 평가는 남에게 보이지 않는 게 평가 다이얼로그의 약속이다.
        val published = workRatingRepository.findByWorkIdIn(workIds)
            .filter { it.published && it.user.id?.let(memberIds::contains) == true }

        // 그 작품의 공개 평균까지 여기서 함께 낸다 — 화면이 작품 목록을 따로 들고 있다가
        // 붙이게 하면, 그 목록을 안 쓰는 화면으로 바뀌는 순간 조용히 빈칸이 된다.
        val averageByWorkId = published
            .groupBy { requireNotNull(it.work.id) }
            .mapValues { (_, ratings) ->
                val scores = ratings.mapNotNull { it.score }
                if (scores.isEmpty()) 0.0 else scores.average()
            }

        return published.mapNotNull { rating ->
            val text = rating.blurb?.trim()
            if (text.isNullOrEmpty()) return@mapNotNull null
            val score = rating.score ?: return@mapNotNull null

            val workId = requireNotNull(rating.work.id)
            val work = workById[workId] ?: return@mapNotNull null

            BlurbResponse(
                workId = workId,
                userId = requireNotNull(rating.user.id),
                kind = work.kind,
                title = work.title,
                author = work.author,
                coverUrl = work.coverUrl,
                rating = score,
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
            rank(work, effectiveMemberIds(studyId), workRatingRepository.findByWorkId(workId), viewerId),
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
     * WorkBlock/WorkNote/WorkRating 은 cascade 없는 NOT NULL FK 라 먼저 안 지우면 참조 무결성
     * 위반으로 실패하므로, 자식부터 순서대로 지운 뒤 Work 를 지운다.
     */
    @Transactional
    fun remove(workId: UUID): Boolean {
        val work = workRepository.findById(workId).orElse(null) ?: return false
        workBlockRepository.deleteAll(workBlockRepository.findByWorkIdOrderByCreatedAt(workId))
        workNoteRepository.deleteByWorkId(workId)
        workRatingRepository.deleteByWorkId(workId)
        sessionRepository.deleteAll(sessionRepository.findByWorkId(workId))
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

    // 명예의 전당 순위는 스터디 멤버(와 관리자)의 평가만 센다.
    private fun effectiveMemberIds(studyId: UUID): Set<UUID> =
        studyMemberRepository.findByStudyId(studyId).mapNotNullTo(mutableSetOf()) { it.user.id }.apply {
            addAll(userRepository.findAllByRole(Role.ADMIN).mapNotNull { it.id })
        }

    /**
     * 여러 책의 평가를 한 번의 쿼리로 모아 책 id 별로 나눈다 — 명예의 전당·책장은 책마다
     * 이 값이 필요한데, 책 수만큼 쿼리를 반복하면(N+1) 책이 늘수록 느려진다.
     */
    private fun ratingsByWorkId(works: List<Work>): Map<UUID, List<WorkRating>> {
        val workIds = works.mapNotNull { it.id }
        if (workIds.isEmpty()) return emptyMap()
        return workRatingRepository.findByWorkIdIn(workIds).groupBy { requireNotNull(it.work.id) }
    }

    /**
     * 점수를 안 매긴 행(한줄평만 써 둔 경우)은 아예 세지 않는다 — "매긴 사람" 목록에도,
     * 평균에도 들어가면 안 된다. 0점을 매긴 것과 안 매긴 것은 다르다.
     */
    private fun rank(
        work: Work,
        memberIds: Set<UUID>,
        ratings: List<WorkRating>,
        viewerId: UUID? = null,
    ): RankedWorkResponse {
        val scored = ratings.filter { it.score != null && it.user.id?.let(memberIds::contains) == true }
        val published = scored.filter { it.published }
        val visible = scored.filter { it.published || it.user.id == viewerId }

        val scoreByUser = visible.associate { it.user.id.toString() to (it.score ?: 0.0) }
        val publishedByUser = published.associate { it.user.id.toString() to (it.score ?: 0.0) }
        val average = if (publishedByUser.isEmpty()) 0.0 else publishedByUser.values.average()
        val ratedUserIds = scored.mapTo(mutableSetOf()) { it.user.id.toString() }
        return work.toRanked(scoreByUser, publishedByUser.keys, ratedUserIds, average)
    }
}
