package com.mirelab.domain.user

/**
 * 사람의 권한. admin 은 가입 신청을 승인하는 사람 하나뿐이라 두 단계로 충분하다.
 * access token 의 `role` 클레임으로 실려 다니고, Spring Security 쪽에서는 `ROLE_ADMIN` /
 * `ROLE_MEMBER` authority 로 바뀐다.
 */
enum class Role {
    ADMIN,
    MEMBER,
}
