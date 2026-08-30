package com.mirelab.infra.user

import com.mirelab.domain.user.Role
import com.mirelab.domain.user.User
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface UserRepository : JpaRepository<User, UUID> {
    fun findByEmail(email: String): User?

    fun findByUsername(username: String): User?

    fun existsByEmail(email: String): Boolean

    fun existsByUsername(username: String): Boolean

    fun findAllByRole(role: Role): List<User>
}
