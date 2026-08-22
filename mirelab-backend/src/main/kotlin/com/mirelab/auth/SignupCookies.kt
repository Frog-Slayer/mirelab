package com.mirelab.auth

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import java.time.Duration
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpHeaders
import org.springframework.http.ResponseCookie
import org.springframework.stereotype.Component

@Component
class SignupCookies(
    @Value("\${mirelab.cookie.secure}") private val secure: Boolean,
    @Value("\${mirelab.signup-token-ttl}") private val tokenTtl: Duration,
) {
    fun write(response: HttpServletResponse, token: String) {
        response.addHeader(HttpHeaders.SET_COOKIE, build(token, tokenTtl).toString())
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
            .sameSite("Lax")
            .maxAge(maxAge)
            .build()

    private companion object {
        const val NAME = "mirelab_signup"
        const val PATH = "/api/auth/signup"
    }
}
