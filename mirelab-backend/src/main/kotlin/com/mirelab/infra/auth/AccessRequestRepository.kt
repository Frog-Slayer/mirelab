package com.mirelab.infra.auth

import com.mirelab.domain.auth.AccessRequest
import com.mirelab.domain.auth.AccessRequestStatus
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface AccessRequestRepository : JpaRepository<AccessRequest, UUID> {
    fun findByEmail(email: String): AccessRequest?

    fun findByStatusOrderByRequestedAtAsc(status: AccessRequestStatus): List<AccessRequest>
}
