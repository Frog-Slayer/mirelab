package com.mirelab.application.work

import com.mirelab.auth.AuthPrincipal
import com.mirelab.application.study.StudyMembershipGuard
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

@RestController
class WorkController(
    private val workService: WorkService,
    private val membershipGuard: StudyMembershipGuard,
) {

    @GetMapping("/api/studies/{slug}/hall-of-fame")
    fun hallOfFame(
        @PathVariable slug: String,
        @AuthenticationPrincipal principal: AuthPrincipal,
    ): List<RankedWorkResponse> {
        membershipGuard.requireStudy(slug, principal.userId)
        return workService.hallOfFame(slug)
    }

    @GetMapping("/api/studies/{slug}/works")
    fun library(
        @PathVariable slug: String,
        @AuthenticationPrincipal principal: AuthPrincipal,
    ): List<LibraryEntryResponse> {
        membershipGuard.requireStudy(slug, principal.userId)
        return workService.library(slug)
    }

    @PostMapping("/api/studies/{slug}/works")
    fun create(
        @PathVariable slug: String,
        @AuthenticationPrincipal principal: AuthPrincipal,
        @RequestBody body: CreateWorkRequest,
    ): ResponseEntity<WorkResponse> {
        membershipGuard.requireStudy(slug, principal.userId)
        return workService.create(slug, principal.userId, body)?.let { ResponseEntity.ok(it) }
            ?: ResponseEntity.notFound().build()
    }

    @GetMapping("/api/works/{workId}")
    fun detail(
        @PathVariable workId: UUID,
        @AuthenticationPrincipal principal: AuthPrincipal,
    ): ResponseEntity<WorkDetailResponse> {
        membershipGuard.requireWork(workId, principal.userId)
        return workService.getDetail(workId, principal.userId)?.let { ResponseEntity.ok(it) }
            ?: ResponseEntity.notFound().build()
    }

    @PatchMapping("/api/works/{workId}/status")
    fun updateStatus(
        @PathVariable workId: UUID,
        @AuthenticationPrincipal principal: AuthPrincipal,
        @RequestBody body: UpdateStatusRequest,
    ): ResponseEntity<Void> {
        membershipGuard.requireWork(workId, principal.userId)
        return if (workService.setStatus(workId, body.status)) ResponseEntity.noContent().build()
        else ResponseEntity.notFound().build()
    }

    @PatchMapping("/api/works/{workId}/reason")
    fun updateReason(
        @PathVariable workId: UUID,
        @AuthenticationPrincipal principal: AuthPrincipal,
        @RequestBody body: UpdateReasonRequest,
    ): ResponseEntity<Void> {
        membershipGuard.requireWork(workId, principal.userId)
        return if (workService.updateReason(workId, principal.userId, body.reason)) {
            ResponseEntity.noContent().build()
        } else {
            ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).build()
        }
    }

    @PatchMapping("/api/works/{workId}")
    fun updateInfo(
        @PathVariable workId: UUID,
        @AuthenticationPrincipal principal: AuthPrincipal,
        @RequestBody body: UpdateWorkInfoRequest,
    ): ResponseEntity<Void> {
        membershipGuard.requireWork(workId, principal.userId)
        return if (workService.updateInfo(workId, body)) ResponseEntity.noContent().build()
        else ResponseEntity.notFound().build()
    }

    @DeleteMapping("/api/works/{workId}")
    fun remove(
        @PathVariable workId: UUID,
        @AuthenticationPrincipal principal: AuthPrincipal,
    ): ResponseEntity<Void> {
        membershipGuard.requireWork(workId, principal.userId)
        return if (workService.remove(workId)) ResponseEntity.noContent().build()
        else ResponseEntity.notFound().build()
    }
}
