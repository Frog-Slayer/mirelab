package com.mirelab.auth

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import java.security.MessageDigest
import org.springframework.http.HttpStatus
import org.springframework.web.filter.OncePerRequestFilter

/**
 * `/internal` 하위는 사람이 아니라 실시간 릴레이(mirelab-realtime)가 부르는 경로다.
 * 사용자 토큰으로 인증할 수 없으니 공유 시크릿 헤더로 막는다 — 릴레이와 백엔드가 같은 값을 쥔다.
 *
 * 이 시크릿만으로는 "누가" 인지 알 수 없다. 그래서 블록 접근 권한은 별도로
 * [com.mirelab.application.work.WorkBlockAccessController] 가 사용자 토큰까지 받아서 따로 본다.
 */
class InternalApiFilter(private val expectedSecret: String) : OncePerRequestFilter() {

    override fun shouldNotFilter(request: HttpServletRequest): Boolean =
        !request.requestURI.startsWith(PREFIX)

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        val provided = request.getHeader(HEADER)

        if (expectedSecret.isBlank() || provided == null || !matches(provided)) {
            response.sendError(HttpStatus.FORBIDDEN.value(), "internal secret mismatch")
            return
        }

        filterChain.doFilter(request, response)
    }

    /** 길이 차이로 새는 정보까지 막을 값은 아니지만, 비교 자체는 상수 시간으로 둔다 */
    private fun matches(provided: String) =
        MessageDigest.isEqual(provided.toByteArray(), expectedSecret.toByteArray())

    private companion object {
        const val PREFIX = "/internal/"
        const val HEADER = "X-Internal-Secret"
    }
}
