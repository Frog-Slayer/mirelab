package com.mirelab.domain.auth

import com.mirelab.domain.user.User
import java.time.Instant
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertSame

class AccessRequestTest {
    @Test
    fun `관리자 승인 뒤 프로필 입력을 마쳐야 최종 승인된다`() {
        val requestedAt = Instant.parse("2026-08-21T00:00:00Z")
        val profileRequestedAt = Instant.parse("2026-08-21T01:00:00Z")
        val approvedAt = Instant.parse("2026-08-21T02:00:00Z")
        val request = AccessRequest(
            email = "member@example.com",
            googleName = "Google Name",
            requestedAt = requestedAt,
        )

        request.requestProfile(profileRequestedAt)

        assertEquals(AccessRequestStatus.PROFILE_REQUIRED, request.status)
        assertEquals(profileRequestedAt, request.decidedAt)
        assertNull(request.grantedUser)

        val user = User(name = "멤버", color = "bg-sky-500", email = request.email)
        request.approve(user, approvedAt)

        assertEquals(AccessRequestStatus.APPROVED, request.status)
        assertEquals(approvedAt, request.decidedAt)
        assertSame(user, request.grantedUser)
    }
}
