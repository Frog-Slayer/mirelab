package com.mirelab.application.rating

import com.mirelab.domain.rating.WorkRating
import java.util.UUID

/**
 * 평가 하나. 남의 것은 공개된 것만 실려 오므로, 받는 쪽이 다시 거를 필요가 없다
 * ([RatingService.visibleFor] 가 이미 걸렀다).
 */
data class WorkRatingResponse(
    val workId: UUID,
    val userId: UUID,
    /** 아직 안 매겼으면 null — 한줄평만 먼저 써 둔 경우 */
    val score: Double?,
    val blurb: String?,
    val published: Boolean,
)

fun WorkRating.toResponse() = WorkRatingResponse(
    workId = work.id!!,
    userId = user.id!!,
    score = score,
    blurb = blurb,
    published = published,
)

/**
 * 빠진 항목은 그대로 둔다 — 별점만 고치는 저장과 한줄평만 고치는 저장이 따로 온다.
 * 한줄평을 지우려면 빈 문자열을 보낸다(null 은 "안 보냈다" 와 구분이 안 된다).
 */
data class SaveRatingRequest(val score: Double? = null, val blurb: String? = null)

data class RatingVisibilityInput(val published: Boolean)
