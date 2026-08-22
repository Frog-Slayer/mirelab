package com.mirelab.application.slot

import com.mirelab.application.study.StudyMembershipGuard
import com.mirelab.auth.AuthPrincipal
import jakarta.servlet.http.HttpServletResponse
import java.util.UUID
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

@RestController
class SlotController(
    private val slotService: SlotService,
    private val membershipGuard: StudyMembershipGuard,
    private val eventPublisher: WorkSlotEventPublisher,
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

    /**
     * 이 작품의 칸 값이 바뀔 때마다 신호를 받는 스트림. 보내는 건 "다시 받아가라"는 신호뿐이고,
     * 무엇이 보이는지는 구독자가 [getSlots] 로 각자 다시 받아간다.
     *
     * 브라우저의 EventSource 는 헤더를 못 실어서 못 쓴다 — access token 을 메모리에만 두고
     * Authorization 헤더로만 보내는 구조라(`lib/api.ts`), 프론트는 fetch 스트림으로 읽는다.
     * 덕분에 이 경로도 다른 API 와 똑같은 인증을 그대로 탄다.
     */
    @GetMapping("/api/works/{workId}/slot-events", produces = [MediaType.TEXT_EVENT_STREAM_VALUE])
    fun slotEvents(
        @PathVariable workId: UUID,
        @AuthenticationPrincipal principal: AuthPrincipal,
        response: HttpServletResponse,
    ): SseEmitter {
        membershipGuard.requireWork(workId, principal.userId)
        // nginx 가 스트림을 모아뒀다 흘려보내면 "다 같이 여는 순간"이 통째로 밀린다.
        response.setHeader("X-Accel-Buffering", "no")
        return eventPublisher.subscribe(workId)
    }

    @PostMapping("/api/works/{workId}/slot-values")
    fun saveValue(
        @PathVariable workId: UUID,
        @AuthenticationPrincipal principal: AuthPrincipal,
        @RequestBody body: SlotValueInput,
    ): SlotValueResponse {
        membershipGuard.requireWork(workId, principal.userId)
        val saved = slotService.saveValue(workId, principal.userId, body)
        // 커밋이 끝난 뒤에 알린다 — 서비스 안에서 보내면 아직 안 보이는 값을 보라고 깨우게 된다.
        eventPublisher.publish(workId)
        return saved
    }

    @PatchMapping("/api/works/{workId}/rating-visibility")
    fun setRatingVisibility(
        @PathVariable workId: UUID,
        @AuthenticationPrincipal principal: AuthPrincipal,
        @RequestBody body: RatingVisibilityInput,
    ): ResponseEntity<Void> {
        membershipGuard.requireWork(workId, principal.userId)
        if (!slotService.setRatingPublished(workId, principal.userId, body.published)) {
            return ResponseEntity.notFound().build()
        }
        eventPublisher.publish(workId)
        return ResponseEntity.noContent().build()
    }
}

data class RatingVisibilityInput(val published: Boolean)
