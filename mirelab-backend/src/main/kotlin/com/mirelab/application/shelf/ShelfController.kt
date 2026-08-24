package com.mirelab.application.shelf

import com.mirelab.application.slot.SlotValueResponse
import com.mirelab.application.work.WorkResponse
import com.mirelab.auth.AuthPrincipal
import java.util.UUID
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/** 주체는 access token 에서 온다 — 클라이언트가 자칭하는 값을 믿지 않는다 */
@RestController
@RequestMapping("/api/me/shelf")
class ShelfController(private val shelfService: ShelfService) {

    @GetMapping
    fun list(@AuthenticationPrincipal principal: AuthPrincipal): ShelfResponse =
        shelfService.list(principal.userId)

    @GetMapping("/{workId}")
    fun getEntry(
        @AuthenticationPrincipal principal: AuthPrincipal,
        @PathVariable workId: UUID,
    ): ResponseEntity<ShelfDetailResponse> =
        shelfService.getEntry(principal.userId, workId)?.let { ResponseEntity.ok(it) }
            ?: ResponseEntity.notFound().build()

    @PostMapping
    fun addPersonalWork(
        @AuthenticationPrincipal principal: AuthPrincipal,
        @RequestBody body: AddPersonalWorkRequest,
    ): ResponseEntity<WorkResponse> =
        shelfService.addPersonalWork(principal.userId, body)?.let { ResponseEntity.ok(it) }
            ?: ResponseEntity.notFound().build()

    @PostMapping("/{workId}/slot-values")
    fun saveValue(
        @AuthenticationPrincipal principal: AuthPrincipal,
        @PathVariable workId: UUID,
        @RequestBody body: ShelfSlotValueInput,
    ): SlotValueResponse = shelfService.saveValue(principal.userId, workId, body)

    @PatchMapping("/{workId}/document")
    fun saveDocument(
        @AuthenticationPrincipal principal: AuthPrincipal,
        @PathVariable workId: UUID,
        @RequestBody body: ShelfDocumentInput,
    ): ResponseEntity<Void> {
        shelfService.saveDocument(principal.userId, workId, body)
        return ResponseEntity.noContent().build()
    }

    @PatchMapping("/{workId}/status")
    fun setStatus(
        @AuthenticationPrincipal principal: AuthPrincipal,
        @PathVariable workId: UUID,
        @RequestBody body: ShelfStatusInput,
    ): ResponseEntity<Void> {
        shelfService.setStatus(principal.userId, workId, body.status)
        return ResponseEntity.noContent().build()
    }
}
