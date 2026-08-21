package com.mirelab.infra.auth

import com.mirelab.domain.auth.AccessRequest
import com.mirelab.domain.auth.AccessRequestStatus
import com.mirelab.domain.user.Role
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface AccessRequestRepository : JpaRepository<AccessRequest, UUID> {
    fun findByEmail(email: String): AccessRequest?

    fun findByStatusOrderByRequestedAtAsc(status: AccessRequestStatus): List<AccessRequest>

    @Query(
        """
        SELECT request
        FROM AccessRequest request
        LEFT JOIN request.grantedUser grantedUser
        WHERE grantedUser.id IS NULL OR grantedUser.role <> :role
        ORDER BY request.requestedAt DESC
        """,
    )
    fun findAllExcludingGrantedUserRole(role: Role): List<AccessRequest>
}
