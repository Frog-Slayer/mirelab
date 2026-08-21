package com.mirelab.auth

import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.access.AccessDeniedHandler
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository
import org.springframework.security.web.AuthenticationEntryPoint

/**
 * 토큰 기반. 세션으로 인증하지 않는다.
 *
 * 다만 `sessionCreationPolicy(STATELESS)` 는 쓰지 않는다 — 구글로 보냈다가 돌아오는 사이
 * state·PKCE verifier 를 보관할 곳이 필요하고 그게 세션이다. 대신
 * [RequestAttributeSecurityContextRepository] 를 써서 **인증 결과가 세션에 저장되지 않게** 막는다.
 * 이게 없으면 로그인 직후 남은 JSESSIONID 만으로 API 가 통과되고, 그때 principal 은
 * [AuthPrincipal] 이 아니라 OidcUser 라 컨트롤러가 조용히 깨진다.
 */
@Configuration
@EnableWebSecurity
class SecurityConfig(
    private val jwtService: JwtService,
    private val oAuth2SuccessHandler: OAuth2SuccessHandler,
    private val oAuth2FailureHandler: OAuth2FailureHandler,
    @Value("\${mirelab.internal-secret}") private val internalSecret: String,
) {

    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() }
            .formLogin { it.disable() }
            .httpBasic { it.disable() }
            .logout { it.disable() } // 로그아웃은 refresh 행까지 지워야 해서 AuthController 가 직접 한다
            .securityContext { it.securityContextRepository(RequestAttributeSecurityContextRepository()) }
            // h2-console 이 프레임을 쓴다 — 기본값 DENY 를 덮어야 콘솔이 열린다
            .headers { headers -> headers.frameOptions { it.sameOrigin() } }
            .authorizeHttpRequests { authorize ->
                authorize
                    .requestMatchers(*PUBLIC_PATHS).permitAll()
                    .requestMatchers("/api/admin/**").hasRole("ADMIN")
                    .anyRequest().authenticated()
            }
            .oauth2Login { oauth2 ->
                // vite dev 서버가 /api 만 프록시한다 — OAuth 경로도 그 아래로 모아야
                // 브라우저가 프론트 origin 으로만 오갈 수 있다.
                oauth2
                    .authorizationEndpoint { it.baseUri("/api/oauth2/authorization") }
                    .redirectionEndpoint { it.baseUri("/api/login/oauth2/code/*") }
                    .successHandler(oAuth2SuccessHandler)
                    .failureHandler(oAuth2FailureHandler)
            }
            .exceptionHandling {
                it.authenticationEntryPoint(jsonEntryPoint())
                it.accessDeniedHandler(jsonAccessDeniedHandler())
            }
            .addFilterBefore(InternalApiFilter(internalSecret), UsernamePasswordAuthenticationFilter::class.java)
            .addFilterBefore(JwtAuthenticationFilter(jwtService), UsernamePasswordAuthenticationFilter::class.java)

        return http.build()
    }

    /**
     * 401·403 을 HTML 오류 페이지 대신 짧은 JSON 으로 낸다 — 프론트의 fetch 래퍼가
     * 응답 본문을 JSON 으로 파싱하기 때문에(`lib/api.ts`) HTML 이 오면 파싱에서 먼저 터진다.
     */
    private fun jsonEntryPoint() = AuthenticationEntryPoint { _, response, _ ->
        writeJson(response, HttpStatus.UNAUTHORIZED, "인증이 필요합니다")
    }

    private fun jsonAccessDeniedHandler() = AccessDeniedHandler { _, response, _ ->
        writeJson(response, HttpStatus.FORBIDDEN, "권한이 없습니다")
    }

    private fun writeJson(response: HttpServletResponse, status: HttpStatus, message: String) {
        response.status = status.value()
        response.contentType = MediaType.APPLICATION_JSON_VALUE
        response.characterEncoding = "UTF-8"
        response.writer.write("""{"message":"${message}"}""")
    }

    private companion object {
        val PUBLIC_PATHS = arrayOf(
            "/api/auth/refresh",
            "/api/auth/logout",
            "/api/oauth2/**",
            "/api/login/oauth2/**",
            "/internal/**", // InternalApiFilter 가 공유 시크릿으로 따로 막는다
            "/h2-console/**",
            "/error",
        )
    }
}
