package com.mirelab.domain.auth

import com.mirelab.domain.user.User
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/**
 * refresh 토큰. 사용자당 한 행만 두고, 새로 발급할 때 기존 행을 지운다(rotation) —
 * 그래야 유출된 옛 토큰이 계속 살아있지 않다.
 *
 * 토큰 원문은 저장하지 않는다. DB 가 새면 그 원문이 그대로 남의 세션이 되기 때문에
 * SHA-256 해시만 넣고, 들어온 값을 같은 방식으로 해시해서 비교한다. 원문은 불투명한
 * 랜덤 문자열이라(엔트로피 256bit) 사전 공격 대상이 아니고, 그래서 salt 없이 단순 해시로 족하다.
 */
@Entity
@Table(name = "refresh_tokens")
class RefreshToken(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    val user: User,

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    var tokenHash: String,

    @Column(name = "expires_at", nullable = false)
    var expiresAt: Instant,
) {
    fun expired(now: Instant = Instant.now()) = now.isAfter(expiresAt)

    /**
     * 같은 행을 덮어쓰는 방식으로 회전한다. 지우고 새로 넣으면 user_id unique 제약 때문에
     * Hibernate 의 flush 순서(insert 가 delete 보다 먼저 나갈 수 있다)에 걸려 터진다.
     */
    fun rotate(tokenHash: String, expiresAt: Instant) {
        this.tokenHash = tokenHash
        this.expiresAt = expiresAt
    }
}
