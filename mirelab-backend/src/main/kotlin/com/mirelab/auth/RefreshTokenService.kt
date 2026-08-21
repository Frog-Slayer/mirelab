package com.mirelab.auth

import com.mirelab.domain.auth.RefreshToken
import com.mirelab.domain.user.User
import com.mirelab.infra.auth.RefreshTokenRepository
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Duration
import java.time.Instant
import java.util.Base64
import java.util.UUID
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * refresh 토큰 발급·검증·폐기.
 *
 * 토큰은 JWT 가 아니라 불투명한 랜덤 문자열이다 — 어차피 DB 를 조회해서 살아있는지 봐야 하니
 * 서명을 넣어도 얻는 게 없고, 대신 "DB 에서 지우면 즉시 죽는다" 는 성질이 분명해진다.
 * 저장은 원문이 아니라 SHA-256 해시로 한다([RefreshToken] 주석 참고).
 */
@Service
class RefreshTokenService(
    private val refreshTokenRepository: RefreshTokenRepository,
    @Value("\${mirelab.refresh-token-ttl}") private val refreshTokenTtl: Duration,
) {
    private val random = SecureRandom()

    /**
     * 새 토큰을 발급하고 그 사람의 기존 토큰을 무효화한다(rotation).
     * 사용자당 한 행이므로, 다른 기기에서 로그인하면 이전 기기는 다음 갱신 때 튕긴다 —
     * 5명 쓰는 스터디 앱에 세션 목록까지 둘 이유가 없어 이 단순함을 택했다.
     */
    @Transactional
    fun issue(user: User, now: Instant = Instant.now()): String {
        val raw = generateRawToken()
        val expiresAt = now.plus(refreshTokenTtl)
        val userId = requireNotNull(user.id) { "저장되지 않은 User 로는 토큰을 발급할 수 없습니다" }

        val existing = refreshTokenRepository.findByUserId(userId)
        if (existing == null) {
            refreshTokenRepository.save(RefreshToken(user = user, tokenHash = hash(raw), expiresAt = expiresAt))
        } else {
            existing.rotate(hash(raw), expiresAt)
        }

        return raw
    }

    /**
     * 들어온 원문이 살아있는 토큰인지 보고 주인을 돌려준다. 만료된 행은 그 자리에서 지운다 —
     * 따로 청소 배치를 둘 만큼 쌓이는 데이터가 아니다.
     */
    @Transactional
    fun findOwner(rawToken: String, now: Instant = Instant.now()): User? {
        val stored = refreshTokenRepository.findByTokenHash(hash(rawToken)) ?: return null

        if (stored.expired(now)) {
            refreshTokenRepository.delete(stored)
            return null
        }

        return stored.user
    }

    @Transactional
    fun revoke(userId: UUID) {
        refreshTokenRepository.deleteByUserId(userId)
    }

    private fun generateRawToken(): String {
        val bytes = ByteArray(32).also(random::nextBytes)
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }

    private fun hash(rawToken: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest(rawToken.toByteArray())
            .joinToString("") { "%02x".format(it) }
}
