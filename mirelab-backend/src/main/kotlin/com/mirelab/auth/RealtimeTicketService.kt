package com.mirelab.auth

import com.mirelab.domain.auth.RealtimeTicket
import com.mirelab.infra.auth.RealtimeTicketRepository
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Duration
import java.time.Instant
import java.util.Base64
import java.util.UUID
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

data class IssuedRealtimeTicket(
    val value: String,
    val expiresInSeconds: Long,
)

/** 블록 전용·초단기·일회용 WebSocket 접속 티켓 발급과 소비. */
@Service
class RealtimeTicketService(
    private val repository: RealtimeTicketRepository,
    @Value("\${mirelab.realtime-ticket-ttl}") private val ttl: Duration,
) {
    private val random = SecureRandom()

    init {
        require(!ttl.isZero && !ttl.isNegative && ttl <= MAX_TTL) {
            "mirelab.realtime-ticket-ttl 은 0초보다 길고 ${MAX_TTL.seconds}초 이하여야 합니다"
        }
    }

    @Transactional
    fun issue(blockId: UUID, userId: UUID, now: Instant = Instant.now()): IssuedRealtimeTicket {
        repository.deleteByExpiresAtLessThanEqual(now)

        val raw = ByteArray(TOKEN_BYTES)
            .also(random::nextBytes)
            .let { Base64.getUrlEncoder().withoutPadding().encodeToString(it) }
        repository.save(
            RealtimeTicket(
                tokenHash = hash(raw),
                blockId = blockId,
                userId = userId,
                expiresAt = now.plus(ttl),
            ),
        )
        return IssuedRealtimeTicket(value = raw, expiresInSeconds = ttl.seconds)
    }

    /**
     * 티켓을 한 번만 쓰게 소비하고, 그 티켓을 받아 간 사람이 누구였는지 돌려준다 —
     * 릴레이가 접속이 사는 동안 그 사람의 권한을 다시 확인하려면 이 id 가 필요하다.
     * 소비하지 못했으면(없거나·다른 방이거나·만료됐거나) null.
     *
     * 주인을 먼저 읽고 삭제는 조건부 DELETE 한 번으로 하므로, 같은 티켓으로 동시에 들어와도
     * 실제로 id 를 받아 가는 쪽은 하나뿐이다.
     */
    @Transactional
    fun consume(blockId: UUID, raw: String?, now: Instant = Instant.now()): UUID? {
        if (raw.isNullOrBlank()) return null
        val tokenHash = hash(raw)
        val userId = repository.findByTokenHash(tokenHash)?.userId ?: return null
        return userId.takeIf { repository.consumeValid(tokenHash, blockId, now) == 1 }
    }

    private fun hash(raw: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest(raw.toByteArray())
            .joinToString("") { "%02x".format(it) }

    private companion object {
        const val TOKEN_BYTES = 32
        val MAX_TTL: Duration = Duration.ofMinutes(1)
    }
}
