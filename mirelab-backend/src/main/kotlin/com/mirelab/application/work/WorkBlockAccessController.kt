package com.mirelab.application.work

import com.mirelab.auth.AccessRequestService
import com.mirelab.auth.AuthPrincipal
import com.mirelab.auth.IssuedRealtimeTicket
import com.mirelab.auth.RealtimeTicketService
import java.util.UUID
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/** 소비된 티켓의 주인 — 릴레이가 이 접속을 누구의 것으로 기억할지 */
data class ConsumedRealtimeTicket(val userId: UUID)

/**
 * 브라우저에는 일반 access token 대신 블록 전용 일회용 티켓을 주고, 실시간 릴레이가
 * WebSocket handshake 때 그 티켓을 한 번 소비하는 곳.
 *
 * 공개 발급 경로는 평범한 REST 인증을 통과하므로 access token 이 Authorization 헤더에만
 * 머문다. 내부 소비 경로는 InternalApiFilter 의 공유 시크릿을 먼저 통과한다.
 *
 * WebSocket 은 한 번 맺으면 몇 시간이고 살아 있어서, 접속 순간의 판정만으로는 그 사이
 * 거부되거나 스터디에서 빠진 사람이 계속 편집하게 된다. 그래서 릴레이가 살아 있는 접속마다
 * [stillAllowed] 로 다시 물어볼 수 있게 열어둔다.
 */
@RestController
class WorkBlockAccessController(
    private val workAccessChecker: WorkAccessChecker,
    private val accessRequestService: AccessRequestService,
    private val realtimeTicketService: RealtimeTicketService,
) {

    @PostMapping("/api/blocks/{blockId}/realtime-ticket")
    fun issue(
        @PathVariable blockId: UUID,
        @AuthenticationPrincipal principal: AuthPrincipal,
    ): ResponseEntity<IssuedRealtimeTicket> = when (check(blockId, principal.userId)) {
        Access.NOT_FOUND -> ResponseEntity.notFound().build()
        Access.DENIED -> ResponseEntity.status(403).build()
        Access.ALLOWED -> ResponseEntity.ok(realtimeTicketService.issue(blockId, principal.userId))
    }

    /**
     * 티켓은 발급 뒤 20초를 사는데 그 사이에도 권한은 바뀔 수 있다 — 소비하면서 한 번 더 본다.
     * 티켓 자체는 실패해도 이미 소비된 상태로 남긴다(재시도로 되살아나면 안 된다).
     */
    @PostMapping("/internal/blocks/{blockId}/realtime-ticket/consume")
    fun consume(
        @PathVariable blockId: UUID,
        @RequestHeader(TICKET_HEADER, required = false) ticket: String?,
    ): ResponseEntity<ConsumedRealtimeTicket> {
        val userId = realtimeTicketService.consume(blockId, ticket)
            ?: return ResponseEntity.status(401).build()

        return if (check(blockId, userId) == Access.ALLOWED) {
            ResponseEntity.ok(ConsumedRealtimeTicket(userId))
        } else {
            ResponseEntity.status(403).build()
        }
    }

    /** 이미 맺어진 접속을 릴레이가 주기적으로 다시 확인하는 곳 — 403·404 면 끊는다 */
    @GetMapping("/internal/blocks/{blockId}/access")
    fun stillAllowed(
        @PathVariable blockId: UUID,
        @RequestParam userId: UUID,
    ): ResponseEntity<Void> = when (check(blockId, userId)) {
        Access.NOT_FOUND -> ResponseEntity.notFound().build()
        Access.DENIED -> ResponseEntity.status(403).build()
        Access.ALLOWED -> ResponseEntity.noContent().build()
    }

    /**
     * "지금 이 사람이 이 블록을 실시간으로 편집해도 되나" 한 군데 판정.
     *
     * 계정이 살아 있는지를 [AccessRequestService.canLogin] 으로 먼저 보는 이유: 거부된 계정도
     * 스터디 멤버십은 그대로 남아 있어서 소속만 보면 통과한다. 평범한 REST 요청은
     * JwtAuthenticationFilter 가 같은 판정으로 막아주지만, 티켓을 소비하는 내부 경로와
     * 재확인 경로에는 그 필터가 없으니 여기서 같은 기준을 다시 세운다.
     */
    private fun check(blockId: UUID, userId: UUID): Access {
        val canAccess = workAccessChecker.canAccessBlock(blockId, userId) ?: return Access.NOT_FOUND
        val allowed = accessRequestService.canLogin(userId) && canAccess
        return if (allowed) Access.ALLOWED else Access.DENIED
    }

    private enum class Access { ALLOWED, DENIED, NOT_FOUND }

    private companion object {
        const val TICKET_HEADER = "X-Realtime-Ticket"
    }
}
