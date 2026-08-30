package com.mirelab.application.user

import com.mirelab.application.post.PostService
import com.mirelab.application.shelf.ShelfService
import com.mirelab.auth.AuthPrincipal
import com.mirelab.infra.user.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

data class BlogProfileResponse(
    val user: UserResponse,
    val postCount: Int,
    val bookCount: Int,
)

@RestController
class BlogProfileController(
    private val userRepository: UserRepository,
    private val postService: PostService,
    private val shelfService: ShelfService,
) {
    @GetMapping("/api/users/{username}")
    fun get(
        @PathVariable username: String,
        @AuthenticationPrincipal principal: AuthPrincipal,
    ): BlogProfileResponse {
        val owner = userRepository.findByUsername(username.lowercase())
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "없는 사용자입니다")
        val ownerId = requireNotNull(owner.id)
        return BlogProfileResponse(
            owner.toResponse(),
            postService.listByUsername(username, principal.userId).size,
            shelfService.list(ownerId, principal.userId).entries.size,
        )
    }
}
