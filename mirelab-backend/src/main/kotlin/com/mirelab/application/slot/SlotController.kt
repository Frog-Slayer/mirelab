package com.mirelab.application.slot

import com.mirelab.application.study.StudyMembershipGuard
import com.mirelab.auth.AuthPrincipal
import java.util.UUID
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

@RestController
class SlotController(
    private val slotService: SlotService,
    private val membershipGuard: StudyMembershipGuard,
) {

    /** 보는 사람이 누구냐에 따라 비공개·마감 전 칸 값이 걸러진다 — 그래서 주체를 토큰에서 받는다 */
    @GetMapping("/api/works/{workId}/slots")
    fun getSlots(
        @PathVariable workId: UUID,
        @AuthenticationPrincipal principal: AuthPrincipal,
    ): ResponseEntity<WorkSlotsResponse> {
        membershipGuard.requireWork(workId, principal.userId)
        return slotService.getWorkSlots(workId, principal.userId)?.let { ResponseEntity.ok(it) }
            ?: ResponseEntity.notFound().build()
    }

    @PostMapping("/api/works/{workId}/slot-values")
    fun saveValue(
        @PathVariable workId: UUID,
        @AuthenticationPrincipal principal: AuthPrincipal,
        @RequestBody body: SlotValueInput,
    ): SlotValueResponse {
        membershipGuard.requireWork(workId, principal.userId)
        return slotService.saveValue(workId, principal.userId, body)
    }
}
