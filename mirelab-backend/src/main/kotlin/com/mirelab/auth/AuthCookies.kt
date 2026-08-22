package com.mirelab.auth

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import java.time.Duration
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpHeaders
import org.springframework.http.ResponseCookie
import org.springframework.stereotype.Component

/**
 * refresh 토큰을 담는 쿠키. httpOnly 라 JS 가 못 읽고, path 를 갱신·로그아웃 경로로 좁혀서
 * 일반 API 요청에는 아예 실려가지 않는다(=실수로 로그에 남을 표면을 줄인다).
 *
 * access 토큰은 쿠키에 안 넣는다 — 프론트가 순수 SPA 라 서버 렌더링이 쿠키를 읽을 일이 없고,
 * 메모리에만 두면 XSS 로 새어도 탭을 닫는 순간 사라진다.
 */
@Component
class AuthCookies(
    @Value("\${mirelab.cookie.secure}") private val secure: Boolean,
    @Value("\${mirelab.refresh-token-ttl}") private val refreshTokenTtl: Duration,
) {
    fun write(response: HttpServletResponse, rawToken: String) {
        response.addHeader(HttpHeaders.SET_COOKIE, build(rawToken, refreshTokenTtl).toString())
    }

    fun clear(response: HttpServletResponse) {
        response.addHeader(HttpHeaders.SET_COOKIE, build("", Duration.ZERO).toString())
    }

    fun read(request: HttpServletRequest): String? =
        request.cookies?.firstOrNull { it.name == NAME }?.value?.takeIf { it.isNotBlank() }

    private fun build(value: String, maxAge: Duration): ResponseCookie =
        ResponseCookie.from(NAME, value)
            .path(PATH)
            .httpOnly(true)
            .secure(secure)
            // Lax: 구글에서 돌아오는 리다이렉트는 top-level navigation 이라 쿠키가 실려온다.
            // Strict 로 하면 그 리다이렉트에서 쿠키가 빠져 최초 로그인이 안 된다.
            .sameSite("Lax")
            .maxAge(maxAge)
            .build()

    private companion object {
        const val NAME = "mirelab_refresh"
        const val PATH = "/api/auth"
    }
}
