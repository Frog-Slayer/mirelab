package com.mirelab.application.work

import com.mirelab.domain.work.WorkBlock
import java.time.Instant
import java.util.UUID

/**
 * 본문은 Yjs 공유 문서라 여기 안 실린다 — 실제 내용은 실시간 서버(WebSocket)로 받는다.
 * 목록에서 빈 블록인지만 구분하면 되니 [hasContent] 만 곁들인다.
 */
data class WorkBlockResponse(
    val id: UUID,
    val workId: UUID,
    val authorId: UUID,
    val title: String,
    val hasContent: Boolean,
    val createdAt: Instant,
)

fun WorkBlock.toResponse() = WorkBlockResponse(
    id = id!!,
    workId = work.id!!,
    authorId = author.id!!,
    title = title,
    hasContent = bodySnapshot != null,
    createdAt = createdAt,
)

data class CreateWorkBlockRequest(val authorId: UUID, val title: String)

data class UpdateWorkBlockTitleRequest(val title: String)
