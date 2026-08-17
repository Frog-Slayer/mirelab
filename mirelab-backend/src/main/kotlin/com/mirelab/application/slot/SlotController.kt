package com.mirelab.application.slot

import java.util.UUID
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RestController

@RestController
class SlotController(private val slotService: SlotService) {

    @GetMapping("/api/works/{workId}/slots")
    fun getSlots(
        @PathVariable workId: UUID,
        @RequestHeader("X-User-Id") viewerId: UUID,
    ): ResponseEntity<WorkSlotsResponse> =
        slotService.getWorkSlots(workId, viewerId)?.let { ResponseEntity.ok(it) } ?: ResponseEntity.notFound().build()

    @PostMapping("/api/works/{workId}/slot-values")
    fun saveValue(@PathVariable workId: UUID, @RequestBody body: SlotValueInput): SlotValueResponse =
        slotService.saveValue(workId, body)
}
