package com.mirelab.auth

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpHeaders
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.filter.OncePerRequestFilter

/**
 * `Authorization: Bearer <access token>` 을 읽어 요청 주체를 세운다.
 *
 * 토큰이 없거나 틀렸을 때 여기서 401 을 내지 않고 그냥 통과시킨다 — 그 판단은
 * `authorizeHttpRequests` 가 한다. 공개 경로(로그인·갱신 등)는 토큰이 없는 게 정상이라
 * 필터가 앞질러 막으면 안 된다.
 */
class JwtAuthenticationFilter(
    private val jwtService: JwtService,
    private val accessRequestService: AccessRequestService,
) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        bearerToken(request)
            ?.let(jwtService::parse)
            ?.takeIf { accessRequestService.canLogin(it.userId) }
            ?.let { principal ->
                SecurityContextHolder.getContext().authentication =
                    UsernamePasswordAuthenticationToken(principal, null, principal.authorities)
            }

        filterChain.doFilter(request, response)
    }

    private fun bearerToken(request: HttpServletRequest): String? =
        request.getHeader(HttpHeaders.AUTHORIZATION)
            ?.takeIf { it.startsWith(BEARER_PREFIX, ignoreCase = true) }
            ?.substring(BEARER_PREFIX.length)
            ?.trim()
            ?.takeIf { it.isNotEmpty() }

    private companion object {
        const val BEARER_PREFIX = "Bearer "
    }
}
