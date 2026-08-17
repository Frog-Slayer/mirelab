package com.mirelab.application.session

import java.time.Instant
import java.util.UUID
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

data class AddSessionRequest(val meetAt: Instant?)

@RestController
class SessionController(private val sessionService: SessionService) {
    @PostMapping("/api/works/{workId}/sessions")
    fun add(@PathVariable workId: UUID, @RequestBody body: AddSessionRequest): ResponseEntity<SessionResponse> =
        sessionService.addForWork(workId, body.meetAt)?.let { ResponseEntity.ok(it) }
            ?: ResponseEntity.notFound().build()
}
