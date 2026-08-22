package com.mirelab.infra.auth

import com.mirelab.domain.auth.RealtimeTicket
import java.time.Instant
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface RealtimeTicketRepository : JpaRepository<RealtimeTicket, UUID> {
    fun findByTokenHash(tokenHash: String): RealtimeTicket?

    /** 검증과 삭제를 SQL 한 번으로 묶어 동시 재사용을 막는다. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
        """
        delete from RealtimeTicket ticket
        where ticket.tokenHash = :tokenHash
          and ticket.blockId = :blockId
          and ticket.expiresAt > :now
        """,
    )
    fun consumeValid(
        @Param("tokenHash") tokenHash: String,
        @Param("blockId") blockId: UUID,
        @Param("now") now: Instant,
    ): Int

    fun deleteByExpiresAtLessThanEqual(now: Instant): Long
}
