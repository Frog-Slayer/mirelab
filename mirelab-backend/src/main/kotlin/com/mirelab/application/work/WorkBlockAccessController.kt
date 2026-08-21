package com.mirelab.application.work

import com.mirelab.auth.JwtService
import com.mirelab.infra.work.WorkBlockRepository
import java.util.UUID
import org.springframework.http.HttpHeaders
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RestController

/**
 * 실시간 릴레이(mirelab-realtime)가 WebSocket 접속을 받아들일지 물어보는 곳.
 *
 * 릴레이가 직접 JWT 를 검증하지 않는 이유: 서명이 맞는다는 것만으로는 "그 사람이 *이 방*에
 * 들어와도 되나" 를 알 수 없다. 방 이름은 블록 id 이고 그 판정에는 작품·스터디 소속이
 * 필요하므로, 접속 시 한 번 여기로 물어 판단 주체를 백엔드 하나로 둔다.
 *
 * 이 경로는 `/internal` 하위라 InternalApiFilter 의 공유 시크릿을 먼저 통과해야 한다 —
 * 즉 "릴레이가 맞다" 는 시크릿으로, "누구냐" 는 아래 Authorization 헤더로 각각 확인한다.
 */
@RestController
class WorkBlockAccessController(
    private val workBlockRepository: WorkBlockRepository,
    private val workAccessChecker: WorkAccessChecker,
    private val jwtService: JwtService,
) {

    @PostMapping("/internal/blocks/{blockId}/authorize")
    fun authorize(
        @PathVariable blockId: UUID,
        @RequestHeader(HttpHeaders.AUTHORIZATION, required = false) authorization: String?,
    ): ResponseEntity<Void> {
        val principal = authorization
            ?.takeIf { it.startsWith(BEARER_PREFIX, ignoreCase = true) }
            ?.substring(BEARER_PREFIX.length)
            ?.trim()
            ?.let(jwtService::parse)
            ?: return ResponseEntity.status(401).build()

        val block = workBlockRepository.findById(blockId).orElse(null)
            ?: return ResponseEntity.notFound().build()

        return if (workAccessChecker.canAccess(block.work, principal.userId)) {
            ResponseEntity.noContent().build()
        } else {
            ResponseEntity.status(403).build()
        }
    }

    private companion object {
        const val BEARER_PREFIX = "Bearer "
    }
}
