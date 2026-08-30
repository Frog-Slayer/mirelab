package com.mirelab.application.note

import com.mirelab.application.study.StudyMembershipGuard
import com.mirelab.auth.AuthPrincipal
import java.util.UUID
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

/**
 * "내 메모" 서랍. 실시간 신호(SSE)를 붙이지 않는 이유: 전부 비공개라 남에게 알릴 변화가 없다 —
 * 값이 바뀌었다고 깨울 상대가 자기 자신뿐이다.
 */
@RestController
class WorkNoteController(
    private val workNoteService: WorkNoteService,
    private val membershipGuard: StudyMembershipGuard,
) {

    @GetMapping("/api/works/{workId}/notes")
    fun list(
        @PathVariable workId: UUID,
        @AuthenticationPrincipal principal: AuthPrincipal,
    ): List<WorkNoteResponse> {
        membershipGuard.requireWork(workId, principal.userId)
        return workNoteService.list(workId, principal.userId)
    }

    @PostMapping("/api/works/{workId}/notes")
    fun create(
        @PathVariable workId: UUID,
        @AuthenticationPrincipal principal: AuthPrincipal,
        @RequestBody body: CreateWorkNoteRequest,
    ): ResponseEntity<WorkNoteResponse> {
        membershipGuard.requireWork(workId, principal.userId)
        return workNoteService.create(workId, principal.userId, body)?.let { ResponseEntity.ok(it) }
            ?: ResponseEntity.notFound().build()
    }

    @PatchMapping("/api/notes/{noteId}")
    fun update(
        @PathVariable noteId: UUID,
        @AuthenticationPrincipal principal: AuthPrincipal,
        @RequestBody body: UpdateWorkNoteRequest,
    ): WorkNoteResponse {
        membershipGuard.requireNote(noteId, principal.userId)
        return workNoteService.update(noteId, principal.userId, body)
    }

    @DeleteMapping("/api/notes/{noteId}")
    fun remove(
        @PathVariable noteId: UUID,
        @AuthenticationPrincipal principal: AuthPrincipal,
    ): ResponseEntity<Void> {
        membershipGuard.requireNote(noteId, principal.userId)
        workNoteService.remove(noteId, principal.userId)
        return ResponseEntity.noContent().build()
    }
}
