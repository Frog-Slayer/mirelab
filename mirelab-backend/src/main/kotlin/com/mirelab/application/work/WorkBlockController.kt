package com.mirelab.application.work

import java.util.UUID
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

@RestController
class WorkBlockController(private val workBlockService: WorkBlockService) {

    @GetMapping("/api/works/{workId}/blocks")
    fun list(@PathVariable workId: UUID): List<WorkBlockResponse> = workBlockService.list(workId)

    @PostMapping("/api/works/{workId}/blocks")
    fun create(
        @PathVariable workId: UUID,
        @RequestBody body: CreateWorkBlockRequest,
    ): ResponseEntity<WorkBlockResponse> =
        workBlockService.create(workId, body)?.let { ResponseEntity.ok(it) } ?: ResponseEntity.notFound().build()

    @PatchMapping("/api/blocks/{blockId}")
    fun updateTitle(
        @PathVariable blockId: UUID,
        @RequestBody body: UpdateWorkBlockTitleRequest,
    ): ResponseEntity<Void> =
        if (workBlockService.updateTitle(blockId, body.title)) ResponseEntity.noContent().build()
        else ResponseEntity.notFound().build()

    @DeleteMapping("/api/blocks/{blockId}")
    fun remove(@PathVariable blockId: UUID): ResponseEntity<Void> =
        if (workBlockService.remove(blockId)) ResponseEntity.noContent().build()
        else ResponseEntity.notFound().build()
}
