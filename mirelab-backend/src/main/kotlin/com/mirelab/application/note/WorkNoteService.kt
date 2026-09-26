package com.mirelab.application.note

import com.mirelab.domain.note.WorkNote
import com.mirelab.infra.note.WorkNoteRepository
import com.mirelab.infra.user.UserRepository
import com.mirelab.infra.work.WorkRepository
import java.time.Instant
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException

/**
 * 나만 보는 메모라, 스터디 멤버십(컨트롤러의 관문)을 통과했더라도 **쓴 사람 본인**이 아니면
 * 읽지도 고치지도 못한다. 함께 쓰는 기록(WorkBlock)은 "쓴 사람만 고친다"를 화면에서 막지만,
 * 여기는 남에게 보이지도 않는 글이라 서버가 막아야 한다.
 */
@Service
class WorkNoteService(
    private val workNoteRepository: WorkNoteRepository,
    private val workRepository: WorkRepository,
    private val userRepository: UserRepository,
) {
    @Transactional(readOnly = true)
    fun list(workId: UUID, authorId: UUID): List<WorkNoteResponse> =
        workNoteRepository.findByWorkIdAndAuthorIdOrderByCreatedAt(workId, authorId).map { it.toResponse() }

    @Transactional
    fun create(workId: UUID, authorId: UUID, input: CreateWorkNoteRequest): WorkNoteResponse? {
        val work = workRepository.findById(workId).orElse(null) ?: return null
        val author = userRepository.findById(authorId).orElse(null) ?: return null
        val now = Instant.now()
        val note = WorkNote(
            work = work,
            author = author,
            kind = input.kind,
            // 보통은 빈 채로 만들어지고 곧바로 화면에서 글이 채워진다
            body = input.body.orEmpty(),
            createdAt = now,
            updatedAt = now,
        )
        return workNoteRepository.save(note).toResponse()
    }

    @Transactional
    fun update(noteId: UUID, authorId: UUID, input: UpdateWorkNoteRequest): WorkNoteResponse {
        val note = requireMine(noteId, authorId)
        input.kind?.let { note.kind = it }
        input.body?.let { note.body = it }
        note.updatedAt = Instant.now()
        return workNoteRepository.save(note).toResponse()
    }

    @Transactional
    fun remove(noteId: UUID, authorId: UUID) {
        workNoteRepository.delete(requireMine(noteId, authorId))
    }

    /**
     * 없는 메모와 남의 메모를 똑같이 404 로 돌려준다 — 403 으로 갈라 주면 "그 id 의 메모가
     * 있긴 하다"는 사실이 새어 나간다. 남의 비공개 메모에 대해서는 그것마저 알릴 필요가 없다.
     */
    private fun requireMine(noteId: UUID, authorId: UUID): WorkNote {
        val note = workNoteRepository.findById(noteId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "없는 메모입니다")
        }
        if (note.author.id != authorId) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "없는 메모입니다")
        }
        return note
    }
}
