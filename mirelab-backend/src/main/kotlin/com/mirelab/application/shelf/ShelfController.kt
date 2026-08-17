package com.mirelab.application.shelf

import com.mirelab.application.slot.SlotValueResponse
import com.mirelab.application.work.WorkResponse
import java.util.UUID
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/** 로그인 전이라 헤더로 현재 사용자를 받는다 — design.md 3장 "인증은 나중에" */
@RestController
@RequestMapping("/api/me/shelf")
class ShelfController(private val shelfService: ShelfService) {

    @GetMapping
    fun list(@RequestHeader("X-User-Id") userId: UUID): ShelfResponse = shelfService.list(userId)

    @GetMapping("/{workId}")
    fun getEntry(
        @RequestHeader("X-User-Id") userId: UUID,
        @PathVariable workId: UUID,
    ): ResponseEntity<ShelfDetailResponse> =
        shelfService.getEntry(userId, workId)?.let { ResponseEntity.ok(it) } ?: ResponseEntity.notFound().build()

    @PostMapping
    fun addPersonalWork(
        @RequestHeader("X-User-Id") userId: UUID,
        @RequestBody body: AddPersonalWorkRequest,
    ): ResponseEntity<WorkResponse> =
        shelfService.addPersonalWork(userId, body)?.let { ResponseEntity.ok(it) } ?: ResponseEntity.notFound().build()

    @PostMapping("/{workId}/slot-values")
    fun saveValue(
        @RequestHeader("X-User-Id") userId: UUID,
        @PathVariable workId: UUID,
        @RequestBody body: ShelfSlotValueInput,
    ): SlotValueResponse = shelfService.saveValue(userId, workId, body)
}
