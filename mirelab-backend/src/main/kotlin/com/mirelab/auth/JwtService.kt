package com.mirelab.auth

import com.mirelab.domain.user.Role
import com.mirelab.domain.user.User
import java.time.Duration
import java.time.Instant
import java.util.UUID
import javax.crypto.spec.SecretKeySpec
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.JwsHeader
import org.springframework.security.oauth2.jwt.JwtClaimsSet
import org.springframework.security.oauth2.jwt.JwtEncoderParameters
import org.springframework.security.oauth2.jwt.JwtException
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder
import org.springframework.stereotype.Service

/** 발급 결과 — 프론트에 만료까지 남은 초를 같이 알려줘야 갱신 시점을 잡을 수 있다 */
data class IssuedAccessToken(
    val value: String,
    val expiresInSeconds: Long,
)

/**
 * access token 서명·검증. HS256 대칭키 하나로 발급도 검증도 한다 — 토큰을 읽는 쪽이
 * 이 백엔드뿐이라 공개키를 나눠줄 상대가 없다.
 *
 * JWT 라이브러리를 따로 안 넣은 이유: oauth2-client 스타터가 끌고 오는
 * spring-security-oauth2-jose 에 이미 Nimbus 기반 Encoder/Decoder 가 있다.
 */
@Service
class JwtService(
    @Value("\${mirelab.jwt.secret}") secret: String,
    @Value("\${mirelab.jwt.access-token-ttl}") private val accessTokenTtl: Duration,
) {
    private val key = run {
        val bytes = secret.toByteArray()
        // HS256 은 키가 최소 256bit 여야 한다. 짧으면 첫 발급 때가 아니라 여기서 바로 깨뜨려
        // "왜 로그인만 하면 500 인지" 를 헤매지 않게 한다.
        require(bytes.size >= 32) {
            "mirelab.jwt.secret 이 너무 짧습니다 — HS256 은 32바이트(=256bit) 이상이 필요합니다 (현재 ${bytes.size}바이트)"
        }
        SecretKeySpec(bytes, "HmacSHA256")
    }

    private val encoder = NimbusJwtEncoder.withSecretKey(key).build()
    private val decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build()

    fun issue(user: User, now: Instant = Instant.now()): IssuedAccessToken {
        val claims = JwtClaimsSet.builder()
            .subject(requireNotNull(user.id) { "저장되지 않은 User 로는 토큰을 발급할 수 없습니다" }.toString())
            .issuedAt(now)
            .expiresAt(now.plus(accessTokenTtl))
            .claim(CLAIM_NAME, user.name)
            .claim(CLAIM_ROLE, user.role.name)
            .build()

        val header = JwsHeader.with(MacAlgorithm.HS256).build()
        val token = encoder.encode(JwtEncoderParameters.from(header, claims))

        return IssuedAccessToken(token.tokenValue, accessTokenTtl.toSeconds())
    }

    /**
     * 서명·만료를 검증하고 주체를 돌려준다. 서명이 틀리거나 만료됐거나 클레임이 이상하면
     * 예외를 던지지 않고 null 이다 — 호출하는 필터 입장에서 "이 요청은 미인증" 이라는 결론이
     * 전부 같기 때문에, 사유를 구분해봐야 쓸 데가 없다.
     */
    fun parse(token: String): AuthPrincipal? {
        val jwt = try {
            decoder.decode(token)
        } catch (_: JwtException) {
            return null
        }

        val userId = jwt.subject?.let { runCatching { UUID.fromString(it) }.getOrNull() } ?: return null
        val name = jwt.getClaimAsString(CLAIM_NAME) ?: return null
        val role = jwt.getClaimAsString(CLAIM_ROLE)
            ?.let { raw -> Role.entries.find { it.name == raw } }
            ?: return null

        return AuthPrincipal(userId = userId, name = name, role = role)
    }

    private companion object {
        const val CLAIM_NAME = "name"
        const val CLAIM_ROLE = "role"
    }
}
