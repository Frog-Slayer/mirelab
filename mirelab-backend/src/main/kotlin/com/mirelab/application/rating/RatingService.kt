package com.mirelab.application.rating

import com.mirelab.domain.rating.WorkRating
import com.mirelab.domain.work.Work
import com.mirelab.infra.rating.WorkRatingRepository
import com.mirelab.infra.user.UserRepository
import com.mirelab.infra.work.WorkRepository
import java.time.Instant
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException

/**
 * 별점과 한줄평. 스터디 작품과 개인 책 모두 같은 표를 쓴다 — 작품은 스터디에 속하거나
 * 개인 소유이거나 둘 중 하나라(`Work.study` / `Work.owner`), (작품, 사람) 한 쌍이면
 * 어느 쪽 기록인지가 저절로 정해진다. 예전에 둘을 가르던 `SlotValueContext` 가 필요 없어진
 * 이유가 이것이다.
 */
@Service
class RatingService(
    private val workRatingRepository: WorkRatingRepository,
    private val workRepository: WorkRepository,
    private val userRepository: UserRepository,
) {
    /**
     * 이 작품에 달린 평가 중 보는 사람에게 보여도 되는 것. 내 것은 늘 보이고, 남의 것은
     * 공개한 것만 보인다 — 공개 전의 점수가 새면 다 같이 여는 순간이 없어진다.
     */
    @Transactional(readOnly = true)
    fun listVisible(workId: UUID, viewerId: UUID): List<WorkRatingResponse> =
        workRatingRepository.findByWorkId(workId)
            .filter { visibleFor(it, viewerId) }
            .map { it.toResponse() }

    fun visibleFor(rating: WorkRating, viewerId: UUID): Boolean =
        rating.published || rating.user.id == viewerId

    /**
     * 별점·한줄평 저장(upsert). 공개 상태는 여기서 안 건드린다 — 이미 공개해 둔 사람이
     * 한줄평을 고쳤다고 도로 비공개가 되면 안 되고, 반대로 비공개인 사람의 수정이 저절로
     * 열려서도 안 된다. 여닫는 일은 [setPublished] 하나뿐이다.
     */
    @Transactional
    fun save(workId: UUID, userId: UUID, input: SaveRatingRequest): WorkRatingResponse {
        val work = workRepository.findById(workId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "없는 작품입니다")
        }
        val rating = mine(work, userId)
        input.score?.let { rating.score = it }
        // 빈 문자열은 "지워달라" 는 뜻이다
        input.blurb?.let { rating.blurb = it.trim().ifEmpty { null } }
        rating.updatedAt = Instant.now()
        return workRatingRepository.save(rating).toResponse()
    }

    /**
     * 공개 토글. 아직 별점을 매기지 않았으면 열 것이 없으므로 실패로 돌려준다 —
     * 점수 없는 한줄평만 열리면 화면이 별점 자리를 빈 채로 그리게 된다.
     */
    @Transactional
    fun setPublished(workId: UUID, userId: UUID, published: Boolean): Boolean {
        val rating = workRatingRepository.findByWorkIdAndUserId(workId, userId) ?: return false
        if (rating.score == null) return false
        rating.published = published
        rating.updatedAt = Instant.now()
        workRatingRepository.save(rating)
        return true
    }

    private fun mine(work: Work, userId: UUID): WorkRating {
        val existing = workRatingRepository.findByWorkIdAndUserId(requireNotNull(work.id), userId)
        if (existing != null) return existing

        val user = userRepository.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인 사용자를 찾을 수 없습니다")
        }
        val now = Instant.now()
        return WorkRating(work = work, user = user, createdAt = now, updatedAt = now)
    }
}
