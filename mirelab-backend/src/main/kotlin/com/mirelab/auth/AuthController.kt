package com.mirelab.auth

import com.mirelab.application.user.UserResponse
import com.mirelab.application.user.toResponse
import com.mirelab.infra.user.UserRepository
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

data class AuthResult(
    val accessToken: String,
    val expiresInSeconds: Long,
    val user: UserResponse,
)

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val userRepository: UserRepository,
    private val refreshTokenService: RefreshTokenService,
    private val jwtService: JwtService,
    private val authCookies: AuthCookies,
) {

    /**
     * 쿠키의 refresh 로 access token 을 받아온다. 최초 로그인 직후(`/auth/callback`)와
     * 새로고침 자동 로그인이 모두 이 하나를 쓴다.
     *
     * GET 이 아니라 POST 인 이유: 부를 때마다 refresh 토큰이 회전하는 상태 변경 작업인데,
     * GET 이면 브라우저·프록시가 미리 당겨가면서 남의 세션을 조용히 무효화할 수 있다.
     */
    @PostMapping("/refresh")
    fun refresh(request: HttpServletRequest, response: HttpServletResponse): AuthResult {
        val rawToken = authCookies.read(request)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다")

        val user = refreshTokenService.findOwner(rawToken)
            ?: run {
                // 죽은 쿠키를 그대로 두면 매 요청마다 같은 401 을 반복한다 — 여기서 걷어낸다.
                authCookies.clear(response)
                throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "다시 로그인해 주세요")
            }

        authCookies.write(response, refreshTokenService.issue(user))
        val accessToken = jwtService.issue(user)

        return AuthResult(accessToken.value, accessToken.expiresInSeconds, user.toResponse())
    }

    /** 토큰이 이미 만료돼 principal 이 없어도 쿠키만으로 정리된다 — 그래서 인증을 요구하지 않는다 */
    @PostMapping("/logout")
    fun logout(request: HttpServletRequest, response: HttpServletResponse): ResponseEntity<Void> {
        authCookies.read(request)
            ?.let(refreshTokenService::findOwner)
            ?.id
            ?.let(refreshTokenService::revoke)

        authCookies.clear(response)

        return ResponseEntity.noContent().build()
    }

    @GetMapping("/me")
    fun me(@AuthenticationPrincipal principal: AuthPrincipal): UserResponse =
        userRepository.findById(principal.userId)
            .map { it.toResponse() }
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "없는 사용자입니다") }
}
