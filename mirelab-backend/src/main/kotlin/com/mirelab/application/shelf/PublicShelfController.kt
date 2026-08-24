package com.mirelab.application.shelf

import com.mirelab.auth.AuthPrincipal
import com.mirelab.infra.user.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

@RestController
class PublicShelfController(
    private val shelfService: ShelfService,
    private val userRepository: UserRepository,
) {
    @GetMapping("/api/users/{username}/shelf")
    fun list(
        @PathVariable username: String,
        @AuthenticationPrincipal principal: AuthPrincipal,
    ): ShelfResponse {
        val owner = userRepository.findByUsername(username.lowercase())
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "없는 사용자입니다")
        return shelfService.list(requireNotNull(owner.id), principal.userId)
    }
}
