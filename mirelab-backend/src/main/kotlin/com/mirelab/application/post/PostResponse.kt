package com.mirelab.application.post

import com.mirelab.application.user.UserResponse
import com.mirelab.application.work.WorkResponse
import java.time.Instant
import java.util.UUID

data class PostSummaryResponse(
    val id: UUID,
    val author: UserResponse,
    val title: String,
    val excerpt: String,
    val work: WorkResponse?,
    val sharedStudyIds: Set<UUID>,
    val published: Boolean,
    val publishedAt: Instant?,
    val createdAt: Instant,
    val updatedAt: Instant,
)

data class PostResponse(
    val id: UUID,
    val author: UserResponse,
    val title: String,
    val bodyJson: String?,
    val excerpt: String,
    val work: WorkResponse?,
    val sharedStudyIds: Set<UUID>,
    val published: Boolean,
    val publishedAt: Instant?,
    val createdAt: Instant,
    val updatedAt: Instant,
)

data class CreatePostRequest(val title: String = "")

data class UpdatePostRequest(
    val title: String,
    val bodyJson: String?,
    val workId: UUID?,
    val sharedStudyIds: Set<UUID>,
    val published: Boolean,
)
