package com.mirelab.application.note

import com.mirelab.domain.note.NoteKind
import com.mirelab.domain.note.WorkNote
import java.time.Instant
import java.util.UUID

/**
 * 작성자 id 를 안 싣는 이유: 이 응답에는 부른 사람 자신의 메모만 담긴다.
 * 넣어 두면 언젠가 남의 메모도 실리는 줄 알고 그걸로 거르는 화면이 생긴다.
 */
data class WorkNoteResponse(
    val id: UUID,
    val workId: UUID,
    val kind: NoteKind,
    val body: String,
    val createdAt: Instant,
    val updatedAt: Instant,
)

fun WorkNote.toResponse() = WorkNoteResponse(
    id = id!!,
    workId = work.id!!,
    kind = kind,
    body = body,
    createdAt = createdAt,
    updatedAt = updatedAt,
)

data class CreateWorkNoteRequest(val kind: NoteKind, val body: String? = null)

/** 둘 다 없어도 되는 이유: 종류만 바꾸는 편집과 본문만 고치는 자동저장이 따로 온다 */
data class UpdateWorkNoteRequest(val kind: NoteKind? = null, val body: String? = null)
