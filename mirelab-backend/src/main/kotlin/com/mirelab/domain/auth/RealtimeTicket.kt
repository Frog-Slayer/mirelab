package com.mirelab.domain.auth

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/**
 * WebSocket handshake 한 번에만 쓸 수 있는 불투명 티켓.
 *
 * 일반 access token 과 달리 특정 블록에만 묶이고 매우 짧게 산다. 원문은 WebSocket URL에
 * 들어가므로 DB에는 SHA-256 해시만 저장한다. 릴레이가 접속을 받을 때 행을 조건부 DELETE
 * 하는 것이 곧 검증과 소비라서, 같은 티켓으로 동시에 접속해도 하나만 성공한다.
 */
@Entity
@Table(name = "realtime_tickets")
class RealtimeTicket(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    val tokenHash: String,

    @Column(name = "block_id", nullable = false)
    val blockId: UUID,

    /**
     * 티켓을 받아 간 사람. 릴레이는 티켓을 소비할 때 이 값으로 "누가 붙었는지" 를 알고,
     * 접속이 사는 동안 주기적으로 같은 사람의 권한을 백엔드에 다시 물어본다.
     */
    @Column(name = "user_id", nullable = false)
    val userId: UUID,

    @Column(name = "expires_at", nullable = false)
    val expiresAt: Instant,
)
