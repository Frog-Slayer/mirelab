package com.mirelab.application.work

import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

@RestController
class WorkController(private val workService: WorkService) {

    @GetMapping("/api/studies/{slug}/hall-of-fame")
    fun hallOfFame(@PathVariable slug: String): List<RankedWorkResponse> = workService.hallOfFame(slug)

    @GetMapping("/api/studies/{slug}/works")
    fun library(@PathVariable slug: String): List<LibraryEntryResponse> = workService.library(slug)

    @PostMapping("/api/studies/{slug}/works")
    fun create(
        @PathVariable slug: String,
        @RequestBody body: CreateWorkRequest,
    ): ResponseEntity<WorkResponse> =
        workService.create(slug, body)?.let { ResponseEntity.ok(it) } ?: ResponseEntity.notFound().build()

    @GetMapping("/api/works/{workId}")
    fun detail(@PathVariable workId: UUID): ResponseEntity<WorkDetailResponse> =
        workService.getDetail(workId)?.let { ResponseEntity.ok(it) } ?: ResponseEntity.notFound().build()

    @PatchMapping("/api/works/{workId}/status")
    fun updateStatus(@PathVariable workId: UUID, @RequestBody body: UpdateStatusRequest): ResponseEntity<Void> =
        if (workService.setStatus(workId, body.status)) ResponseEntity.noContent().build()
        else ResponseEntity.notFound().build()

    @PatchMapping("/api/works/{workId}/reason")
    fun updateReason(@PathVariable workId: UUID, @RequestBody body: UpdateReasonRequest): ResponseEntity<Void> =
        if (workService.updateReason(workId, body.userId, body.reason)) ResponseEntity.noContent().build()
        else ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).build()

    @DeleteMapping("/api/works/{workId}")
    fun remove(@PathVariable workId: UUID): ResponseEntity<Void> =
        if (workService.remove(workId)) ResponseEntity.noContent().build()
        else ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).build()
}
