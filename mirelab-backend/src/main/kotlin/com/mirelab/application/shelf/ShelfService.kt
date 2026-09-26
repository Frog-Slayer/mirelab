package com.mirelab.application.shelf

import com.mirelab.application.post.PostResponse
import com.mirelab.application.post.PostService
import com.mirelab.application.rating.RatingService
import com.mirelab.application.rating.SaveRatingRequest
import com.mirelab.application.rating.WorkRatingResponse
import com.mirelab.application.rating.toResponse
import com.mirelab.application.study.toResponse
import com.mirelab.application.work.WorkAccessChecker
import com.mirelab.application.work.WorkResponse
import com.mirelab.application.work.toResponse
import com.mirelab.domain.rating.WorkRating
import com.mirelab.domain.work.Work
import com.mirelab.domain.work.WorkKind
import com.mirelab.domain.work.WorkStatus
import com.mirelab.infra.rating.WorkRatingRepository
import com.mirelab.infra.user.UserRepository
import com.mirelab.infra.work.WorkRepository
import java.time.Year
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException

/**
 * 내 서재 — 혼자 읽은 책과 스터디 작품을 합친 개인 관점. 스터디에서 온 책은 그 작품
 * 상세에서 매긴 평가를 그대로 보여준다 — 스터디 책 <-> 서재 책이 같은 작품이면 기록도
 * 같아야 한다. 평가는 (작품, 사람) 한 쌍에 하나뿐이라 어느 쪽에서 매겼는지를 따로
 * 구분할 필요가 없다(예전의 SlotValueContext 가 하던 일이다).
 */
@Service
class ShelfService(
    private val workRepository: WorkRepository,
    private val workRatingRepository: WorkRatingRepository,
    private val ratingService: RatingService,
    private val userRepository: UserRepository,
    private val workAccessChecker: WorkAccessChecker,
    private val postService: PostService,
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
        // 책마다 따로 묻지 않고 한 번에 읽어 온다(N+1 방지)
        val ratingByWorkId = workRatingRepository
            .findByUserIdAndWorkIdIn(ownerId, works.mapNotNull { it.id })
            .associateBy { requireNotNull(it.work.id) }

        val entries = works.map { work ->
            val rating = ratingByWorkId[work.id]?.takeIf { mine || it.published }
            ShelfEntryResponse(work.toResponse(), work.study?.toResponse(), rating?.toResponse())
        }
        return ShelfResponse(entries)
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

        return ShelfDetailResponse(
            work.toResponse(),
            work.study?.toResponse(),
            workRatingRepository.findByWorkIdAndUserId(workId, userId)?.toResponse(),
            work.personalBodyJson,
            postService.personalWorkPublication(workId, userId),
        )
    }

    @Transactional
    fun saveDocument(userId: UUID, workId: UUID, input: ShelfDocumentInput) {
        val work = requirePersonalWork(workId, userId)
        work.personalBodyJson = input.bodyJson
        postService.syncPersonalWorkDocument(workId, userId, input.bodyJson)
    }

    @Transactional
    fun updatePublication(userId: UUID, workId: UUID, input: ShelfPublicationInput): PostResponse =
        postService.updatePersonalWorkPublication(
            userId,
            workId,
            input.title,
            input.published,
        )

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
     * 개인 책의 평가 저장(upsert).
     *
     * 스터디 책은 여기로 못 쓴다 — 쓰는 곳은 스터디 작품 상세 하나뿐이다([getEntry] 참고).
     * 읽는 문([getEntry])만 닫고 쓰는 문을 열어두면, 화면은 없는데 경로만 살아 있는 상태가
     * 된다.
     */
    @Transactional
    fun saveRating(userId: UUID, workId: UUID, input: SaveRatingRequest): WorkRatingResponse {
        val work = workRepository.findById(workId).orElseThrow()
        if (work.study != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "스터디 작품 상세에서 기록하는 책입니다")
        }
        if (!workAccessChecker.canAccess(work, userId, myStudyIds(userId))) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "접근할 수 없는 작품입니다")
        }
        return ratingService.save(workId, userId, input)
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

    /**
     * 남의 서재에는 공개한 평가가 있는 책만 꽂힌다. 예전에는 "무엇을 남에게 보여도 되는가"를
     * 칸 종류로 가려야 했는데(별점과 공개 한줄평만), 지금은 남에게 보일 수 있는 기록이
     * [WorkRating] 하나뿐이라 그 판정이 통째로 없어졌다 — 메모는 애초에 서재에 안 실린다.
     */
    private fun hasPublishedRating(work: Work, ownerId: UUID): Boolean =
        workRatingRepository.findByWorkIdAndUserId(requireNotNull(work.id), ownerId)?.published == true
}
