package com.mirelab.auth

import com.mirelab.application.user.AdminUserResponse
import com.mirelab.application.user.toAdminResponse
import com.mirelab.domain.auth.AccessRequest
import com.mirelab.domain.auth.AccessRequestStatus
import com.mirelab.infra.user.UserRepository
import java.time.Instant
import java.util.UUID
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

data class AccessRequestResponse(
    val id: UUID,
    val email: String,
    val googleName: String,
    val pictureUrl: String?,
    val requestedAt: Instant,
    val status: AccessRequestStatus,
)

fun AccessRequest.toResponse() =
    AccessRequestResponse(id!!, email, googleName, pictureUrl, requestedAt, status)

data class ChangeAccessRequestStatus(val status: AccessRequestStatus)

/** 접근 제어는 SecurityConfig 의 `/api/admin` 하위 매처 → hasRole("ADMIN") 이 담당한다 */
@RestController
@RequestMapping("/api/admin")
class AdminController(
    private val accessRequestService: AccessRequestService,
    private val userRepository: UserRepository,
) {

    @GetMapping("/access-requests")
    fun accessRequests(): List<AccessRequestResponse> =
        accessRequestService.all().map { it.toResponse() }

    @GetMapping("/users")
    fun users(): List<AdminUserResponse> =
        userRepository.findAll().map { it.toAdminResponse() }

    @PostMapping("/access-requests/{requestId}/approve")
    fun approve(
        @PathVariable requestId: UUID,
    ): ResponseEntity<Void> {
        accessRequestService.approve(requestId)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/access-requests/{requestId}/reject")
    fun reject(@PathVariable requestId: UUID): ResponseEntity<Void> {
        accessRequestService.reject(requestId)
        return ResponseEntity.noContent().build()
    }

    @PatchMapping("/access-requests/{requestId}/status")
    fun changeStatus(
        @PathVariable requestId: UUID,
        @RequestBody body: ChangeAccessRequestStatus,
    ): ResponseEntity<Void> {
        accessRequestService.changeStatus(requestId, body.status)
        return ResponseEntity.noContent().build()
    }
}
