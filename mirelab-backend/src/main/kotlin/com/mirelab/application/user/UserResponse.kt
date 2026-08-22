package com.mirelab.application.user

import com.mirelab.domain.user.Role
import com.mirelab.domain.user.User
import java.util.UUID

/**
 * 사진은 파일 이름 대신 바로 쓸 수 있는 경로로 내보낸다 — 프론트가 저장 방식을 알 필요가 없고,
 * 나중에 CDN 이든 다른 경로든 바꿔도 화면 코드는 그대로다. 사진이 없으면 null 이고 그때는
 * 프론트가 이름·색으로 기본 아바타를 그린다.
 */
fun profilePictureUrl(filename: String?): String? =
    filename?.let { "/api/profile-pictures/$it" }

data class UserResponse(
    val id: UUID,
    val name: String,
    val color: String,
    val role: Role,
    val pictureUrl: String?,
)

fun User.toResponse() = UserResponse(id!!, name, color, role, profilePictureUrl(pictureFilename))

/** admin 화면 전용 — 로그인 계정이 붙었는지 보려면 이메일이 필요하다 */
data class AdminUserResponse(
    val id: UUID,
    val name: String,
    val color: String,
    val role: Role,
    val email: String?,
    val studyIds: List<UUID>,
    val pictureUrl: String?,
)

fun User.toAdminResponse(studyIds: List<UUID> = emptyList()) =
    AdminUserResponse(id!!, name, color, role, email, studyIds, profilePictureUrl(pictureFilename))
