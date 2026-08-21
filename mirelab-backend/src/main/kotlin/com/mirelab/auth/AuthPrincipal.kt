package com.mirelab.auth

import com.mirelab.domain.user.Role
import java.util.UUID
import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.authority.SimpleGrantedAuthority

/**
 * 검증된 access token 에서 뽑아낸 요청 주체. 컨트롤러는 `@AuthenticationPrincipal` 로 받는다.
 *
 * 여기 담긴 값은 전부 토큰 안에 있던 것이라 DB 를 안 거친다 — 그래서 이름을 바꾸거나 권한을
 * 내리면 그 사람의 access token 이 만료될 때까지(30분) 반영이 늦다. 그 정도는 감수한다.
 */
data class AuthPrincipal(
    val userId: UUID,
    val name: String,
    val role: Role,
) {
    val authorities: List<GrantedAuthority>
        get() = listOf(SimpleGrantedAuthority("ROLE_${role.name}"))
}
