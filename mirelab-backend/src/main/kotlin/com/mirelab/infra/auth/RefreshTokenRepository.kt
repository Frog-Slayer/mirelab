package com.mirelab.infra.auth

import com.mirelab.domain.auth.RefreshToken
import java.util.UUID
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository

interface RefreshTokenRepository : JpaRepository<RefreshToken, UUID> {
    /**
     * user 를 같이 가져온다 — 갱신 응답에는 사람 이름·색이 실리는데, LAZY 프록시를
     * 트랜잭션 밖으로 내보내면 그걸 읽는 순간 LazyInitializationException 이 난다.
     */
    @EntityGraph(attributePaths = ["user"])
    fun findByTokenHash(tokenHash: String): RefreshToken?

    fun findByUserId(userId: UUID): RefreshToken?

    fun deleteByUserId(userId: UUID)
}
