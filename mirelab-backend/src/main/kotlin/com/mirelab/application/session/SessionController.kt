package com.mirelab.application.session

import com.mirelab.application.study.StudyMembershipGuard
import com.mirelab.auth.AuthPrincipal
import java.time.Instant
import java.util.UUID
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

data class AddSessionRequest(val meetAt: Instant?)

@RestController
class SessionController(
    private val sessionService: SessionService,
    private val membershipGuard: StudyMembershipGuard,
) {
    @PostMapping("/api/works/{workId}/sessions")
    fun add(
        @PathVariable workId: UUID,
        @AuthenticationPrincipal principal: AuthPrincipal,
        @RequestBody body: AddSessionRequest,
    ): ResponseEntity<SessionResponse> {
        membershipGuard.requireWork(workId, principal.userId)
        return sessionService.addForWork(workId, body.meetAt)?.let { ResponseEntity.ok(it) }
            ?: ResponseEntity.notFound().build()
    }

    @GetMapping("/api/studies/{slug}/schedule")
    fun schedule(
        @PathVariable slug: String,
        @AuthenticationPrincipal principal: AuthPrincipal,
    ): List<ScheduleItemResponse> {
        membershipGuard.requireStudy(slug, principal.userId)
        return sessionService.schedule(slug)
    }

    @GetMapping("/api/studies/{slug}/current-session")
    fun currentSession(
        @PathVariable slug: String,
        @AuthenticationPrincipal principal: AuthPrincipal,
    ): ResponseEntity<CurrentSessionResponse> {
        membershipGuard.requireStudy(slug, principal.userId)
        return sessionService.currentSession(slug)?.let { ResponseEntity.ok(it) }
            ?: ResponseEntity.noContent().build()
    }
}
