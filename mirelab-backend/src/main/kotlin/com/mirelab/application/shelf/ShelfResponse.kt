package com.mirelab.application.shelf

import com.mirelab.application.post.PostResponse
import com.mirelab.application.rating.WorkRatingResponse
import com.mirelab.application.study.StudyResponse
import com.mirelab.application.work.WorkResponse
import com.mirelab.domain.work.WorkKind
import com.mirelab.domain.work.WorkStatus

data class ShelfEntryResponse(
    val work: WorkResponse,
    /** 이 책이 스터디에서 온 것이면 그 스터디, 개인 책이면 null */
    val study: StudyResponse?,
    /** 서재 주인의 평가. 아직 안 남겼거나(남의 서재라면) 공개 안 했으면 null */
    val rating: WorkRatingResponse?,
)

/** 내 서재 목록 화면 */
data class ShelfResponse(
    val entries: List<ShelfEntryResponse>,
)

data class ShelfDetailResponse(
    val work: WorkResponse,
    val study: StudyResponse?,
    val rating: WorkRatingResponse?,
    val personalBodyJson: String?,
    val publication: PostResponse?,
)

data class AddPersonalWorkRequest(
    val kind: WorkKind,
    val title: String,
    val author: String,
    val coverUrl: String? = null,
    val description: String? = null,
    val year: Int? = null,
)

data class ShelfDocumentInput(val bodyJson: String?)

data class ShelfStatusInput(val status: WorkStatus)

data class ShelfPublicationInput(
    val title: String,
    val published: Boolean,
)
