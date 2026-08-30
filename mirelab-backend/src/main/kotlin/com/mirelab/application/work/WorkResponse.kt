package com.mirelab.application.work

import com.mirelab.application.session.SessionResponse
import com.mirelab.domain.work.Work
import com.mirelab.domain.work.WorkKind
import com.mirelab.domain.work.WorkStatus
import java.time.Instant
import java.util.UUID

data class WorkResponse(
    val id: UUID,
    val studyId: UUID?,
    val ownerId: UUID?,
    val kind: WorkKind,
    val title: String,
    val author: String,
    val year: Int,
    val status: WorkStatus,
    val addedBy: UUID?,
    val reason: String?,
    val description: String?,
    val coverUrl: String?,
    val actors: List<String>,
    /** 상태별 정렬 기준이 되는 시각들 — [com.mirelab.domain.work.Work.moveTo] 참고 */
    val addedAt: Instant?,
    val startedAt: Instant?,
    val finishedAt: Instant?,
)

fun Work.toResponse() = WorkResponse(
    id = id!!,
    studyId = study?.id,
    ownerId = owner?.id,
    kind = kind,
    title = title,
    author = author,
    year = year,
    status = status,
    addedBy = addedBy?.id,
    reason = reason,
    description = description,
    coverUrl = coverUrl,
    // toList() 로 복사해야 한다 — actors 는 lazy @ElementCollection 이라 그대로 담으면
    // 아직 안 읽은 컬렉션이 DTO 에 실려 나가고, 트랜잭션이 끝난 뒤 Jackson 이 직렬화하다
    // "no session" 으로 터진다. 엔티티의 가변 컬렉션을 응답이 그대로 물고 있지 않게 되는
    // 것도 덤이다.
    actors = actors.toList(),
    addedAt = addedAt,
    startedAt = startedAt,
    finishedAt = finishedAt,
)

/** 완료작 순위·서재 정렬에 쓰는, 평점이 집계된 작품 */
data class RankedWorkResponse(
    val id: UUID,
    val studyId: UUID?,
    val ownerId: UUID?,
    val kind: WorkKind,
    val title: String,
    val author: String,
    val year: Int,
    val status: WorkStatus,
    val addedBy: UUID?,
    val reason: String?,
    val description: String?,
    val coverUrl: String?,
    val actors: List<String>,
    /** userId(문자열) → 평점. 남의 값은 공개한 것만 담긴다 */
    val ratings: Map<String, Double>,
    val publishedRatingUserIds: Set<String>,
    /**
     * 평점을 남긴 사람 전체 — 비공개로 매긴 사람까지 포함한다. 점수는 안 주고 "매겼다"는
     * 사실만 주는 값이라, 아직 안 매긴 사람과 비공개로 매긴 사람을 화면에서 구분할 수 있다.
     */
    val ratedUserIds: Set<String>,
    val average: Double,
    val voterCount: Int,
    val addedAt: Instant?,
    val startedAt: Instant?,
    val finishedAt: Instant?,
)

fun Work.toRanked(
    ratings: Map<String, Double>,
    publishedRatingUserIds: Set<String>,
    ratedUserIds: Set<String>,
    average: Double,
): RankedWorkResponse = RankedWorkResponse(
    id = id!!,
    studyId = study?.id,
    ownerId = owner?.id,
    kind = kind,
    title = title,
    author = author,
    year = year,
    status = status,
    addedBy = addedBy?.id,
    reason = reason,
    description = description,
    coverUrl = coverUrl,
    // lazy @ElementCollection 이라 여기서 복사해 둔다 — [Work.toResponse] 의 주석 참고
    actors = actors.toList(),
    ratings = ratings,
    publishedRatingUserIds = publishedRatingUserIds,
    ratedUserIds = ratedUserIds,
    average = average,
    voterCount = publishedRatingUserIds.size,
    addedAt = addedAt,
    startedAt = startedAt,
    finishedAt = finishedAt,
)

/** 책장 — 후보·읽는 중까지 포함한 전체 작품. 회차 수까지 곁들인다 */
data class LibraryEntryResponse(
    val id: UUID,
    val studyId: UUID?,
    val ownerId: UUID?,
    val kind: WorkKind,
    val title: String,
    val author: String,
    val year: Int,
    val status: WorkStatus,
    val addedBy: UUID?,
    val reason: String?,
    val description: String?,
    val coverUrl: String?,
    val actors: List<String>,
    val ratings: Map<String, Double>,
    val publishedRatingUserIds: Set<String>,
    val ratedUserIds: Set<String>,
    val average: Double,
    val voterCount: Int,
    val sessionCount: Int,
    val addedAt: Instant?,
    val startedAt: Instant?,
    val finishedAt: Instant?,
)

fun RankedWorkResponse.toLibraryEntry(sessionCount: Int) = LibraryEntryResponse(
    id = id,
    studyId = studyId,
    ownerId = ownerId,
    kind = kind,
    title = title,
    author = author,
    year = year,
    status = status,
    addedBy = addedBy,
    reason = reason,
    description = description,
    coverUrl = coverUrl,
    actors = actors,
    ratings = ratings,
    publishedRatingUserIds = publishedRatingUserIds,
    ratedUserIds = ratedUserIds,
    average = average,
    voterCount = voterCount,
    sessionCount = sessionCount,
    addedAt = addedAt,
    startedAt = startedAt,
    finishedAt = finishedAt,
)

/** 작품 상세 화면 — 순위 정보 곁들인 작품 + 걸린 회차들 */
data class WorkDetailResponse(
    val work: RankedWorkResponse,
    val sessions: List<SessionResponse>,
)

/**
 * 공개된 한줄평 하나 — 누가, 어느 작품에, 몇 점과 함께 남겼는지.
 *
 * 작성자 정보는 id 만 준다. 화면이 이미 스터디 멤버 목록을 들고 있어서 거기서 이름·아바타를
 * 찾으면 되고, 여기서 유저를 통째로 실으면 목록 하나에 같은 사람이 여러 번 복사된다.
 */
data class BlurbResponse(
    val workId: UUID,
    val userId: UUID,
    val kind: WorkKind,
    val title: String,
    val author: String,
    val coverUrl: String?,
    /** 이 사람이 매긴 점수 */
    val rating: Double,
    /** 그 작품의 공개 평점 평균 — 한줄평 옆에 함께 보여준다 */
    val average: Double,
    val text: String,
)
