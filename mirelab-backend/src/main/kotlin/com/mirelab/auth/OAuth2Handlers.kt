package com.mirelab.auth

import com.mirelab.infra.user.UserRepository
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.core.Authentication
import org.springframework.security.core.AuthenticationException
import org.springframework.security.oauth2.core.user.OAuth2User
import org.springframework.security.web.authentication.AuthenticationFailureHandler
import org.springframework.security.web.authentication.AuthenticationSuccessHandler
import org.springframework.stereotype.Component
import org.springframework.web.util.UriComponentsBuilder

/**
 * 구글 인증이 끝난 뒤 갈림길.
 *
 * access token 을 리다이렉트 URL 에 실어 보내지 않는다 — 쿠키에 refresh 만 심고 프론트를
 * `/auth/callback` 으로 보내면, 프론트는 거기서 갱신 API 를 한 번 부르면 된다. 그러면
 * "최초 로그인" 과 "새로고침 자동 로그인" 이 완전히 같은 경로가 되고, 토큰이 브라우저
 * 히스토리나 Referer 에 남지 않는다.
 */
@Component
class OAuth2SuccessHandler(
    @Value("\${mirelab.frontend-url}") private val frontendUrl: String,
    private val userRepository: UserRepository,
    private val accessRequestService: AccessRequestService,
    private val refreshTokenService: RefreshTokenService,
    private val authCookies: AuthCookies,
) : AuthenticationSuccessHandler {
    private val logger = LoggerFactory.getLogger(this::class.java)

    override fun onAuthenticationSuccess(
        request: HttpServletRequest,
        response: HttpServletResponse,
        authentication: Authentication,
    ) {
        val oauth2User = authentication.principal as? OAuth2User
        val email = oauth2User?.getAttribute<String>("email")

        if (email.isNullOrBlank()) {
            // 구글이 email 스코프를 안 줬거나 미인증 계정 — 여기서 더 진행할 방법이 없다.
            logger.warn("구글 응답에 email 이 없어 로그인을 중단했습니다")
            redirect(response, "error", "no_email")
            return
        }

        val user = userRepository.findByEmail(email)

        if (user == null) {
            accessRequestService.record(
                email = email,
                googleName = oauth2User.getAttribute<String>("name")?.takeIf { it.isNotBlank() } ?: email,
                pictureUrl = oauth2User.getAttribute("picture"),
            )
            logger.info("가입 신청 접수: {}", email)
            redirect(response, "status", "pending")
            return
        }

        authCookies.write(response, refreshTokenService.issue(user))
        logger.info("로그인 성공: {} ({})", user.name, email)

        response.sendRedirect("$frontendUrl/auth/callback")
    }

    private fun redirect(response: HttpServletResponse, key: String, value: String) {
        val url = UriComponentsBuilder.fromUriString("$frontendUrl/login")
            .queryParam(key, value)
            .build()
            .encode()
            .toUriString()
        response.sendRedirect(url)
    }
}

@Component
class OAuth2FailureHandler(
    @Value("\${mirelab.frontend-url}") private val frontendUrl: String,
) : AuthenticationFailureHandler {
    private val logger = LoggerFactory.getLogger(this::class.java)

    override fun onAuthenticationFailure(
        request: HttpServletRequest,
        response: HttpServletResponse,
        exception: AuthenticationException,
    ) {
        logger.warn("구글 로그인 실패", exception)
        response.sendRedirect("$frontendUrl/login?error=oauth_failed")
    }
}
