package com.mirelab.auth

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

data class SignupIdentity(val requestId: UUID, val email: String)

/**
 * 관리자 승인을 받은 구글 계정이 가입 정보를 입력할 때만 쓰는 짧은 수명의 서명 토큰.
 * 일반 access token과 달리 API 권한은 전혀 없고 `/api/auth/signup`에서만 직접 검증한다.
 */
@Service
class SignupTokenService(
    @Value("\${mirelab.jwt.secret}") secret: String,
    @Value("\${mirelab.signup-token-ttl}") private val tokenTtl: Duration,
) {
    private val key = SecretKeySpec(secret.toByteArray(), "HmacSHA256")
    private val encoder = NimbusJwtEncoder.withSecretKey(key).build()
    private val decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build()

    fun issue(requestId: UUID, email: String, now: Instant = Instant.now()): String {
        val claims = JwtClaimsSet.builder()
            .subject(requestId.toString())
            .issuedAt(now)
            .expiresAt(now.plus(tokenTtl))
            .claim(CLAIM_EMAIL, email)
            .claim(CLAIM_PURPOSE, PURPOSE_SIGNUP)
            .build()
        return encoder.encode(
            JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims),
        ).tokenValue
    }

    fun parse(rawToken: String): SignupIdentity? {
        val jwt = try {
            decoder.decode(rawToken)
        } catch (_: JwtException) {
            return null
        }
        if (jwt.getClaimAsString(CLAIM_PURPOSE) != PURPOSE_SIGNUP) return null

        val requestId = jwt.subject?.let { runCatching { UUID.fromString(it) }.getOrNull() } ?: return null
        val email = jwt.getClaimAsString(CLAIM_EMAIL)?.takeIf { it.isNotBlank() } ?: return null
        return SignupIdentity(requestId, email)
    }

    private companion object {
        const val CLAIM_EMAIL = "email"
        const val CLAIM_PURPOSE = "purpose"
        const val PURPOSE_SIGNUP = "signup"
    }
}
