package com.mirelab.infra.auth

import com.mirelab.domain.auth.RefreshToken
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface RefreshTokenRepository : JpaRepository<RefreshToken, UUID> {
    fun findByTokenHash(tokenHash: String): RefreshToken?

    fun findByUserId(userId: UUID): RefreshToken?

    fun deleteByUserId(userId: UUID)
}
