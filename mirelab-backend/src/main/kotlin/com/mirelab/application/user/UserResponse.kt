package com.mirelab.application.user

import com.mirelab.domain.user.User
import java.util.UUID

data class UserResponse(
    val id: UUID,
    val name: String,
    val color: String,
)

fun User.toResponse() = UserResponse(id!!, name, color)
