package com.mirelab.application.work

import com.mirelab.application.session.SessionResponse
import com.mirelab.domain.work.Work
import com.mirelab.domain.work.WorkKind
import com.mirelab.domain.work.WorkStatus
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
    val actors: List<String>,
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
    actors = actors,
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
    val actors: List<String>,
    /** userId(문자열) → 평점 */
    val ratings: Map<String, Double>,
    val average: Double,
    val voterCount: Int,
)

fun Work.toRanked(ratings: Map<String, Double>, average: Double): RankedWorkResponse = RankedWorkResponse(
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
    actors = actors,
    ratings = ratings,
    average = average,
    voterCount = ratings.size,
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
    val actors: List<String>,
    val ratings: Map<String, Double>,
    val average: Double,
    val voterCount: Int,
    val sessionCount: Int,
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
    actors = actors,
    ratings = ratings,
    average = average,
    voterCount = voterCount,
    sessionCount = sessionCount,
)

/** 작품 상세 화면 — 순위 정보 곁들인 작품 + 걸린 회차들 */
data class WorkDetailResponse(
    val work: RankedWorkResponse,
    val sessions: List<SessionResponse>,
)
