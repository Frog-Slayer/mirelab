package com.mirelab.application.user

import com.mirelab.domain.user.Role
import com.mirelab.domain.user.User
import java.util.UUID

data class UserResponse(
    val id: UUID,
    val name: String,
    val color: String,
    val role: Role,
)

fun User.toResponse() = UserResponse(id!!, name, color, role)

/** admin 화면 전용 — 로그인 계정이 붙었는지 보려면 이메일이 필요하다 */
data class AdminUserResponse(
    val id: UUID,
    val name: String,
    val color: String,
    val role: Role,
    val email: String?,
    val studyIds: List<UUID>,
)

fun User.toAdminResponse(studyIds: List<UUID> = emptyList()) =
    AdminUserResponse(id!!, name, color, role, email, studyIds)
