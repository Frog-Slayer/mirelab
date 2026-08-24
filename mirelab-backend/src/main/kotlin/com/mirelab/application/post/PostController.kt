package com.mirelab.application.post

import com.mirelab.auth.AuthPrincipal
import com.mirelab.application.study.StudyMembershipGuard
import java.util.UUID
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

@RestController
class PostController(
    private val postService: PostService,
    private val membershipGuard: StudyMembershipGuard,
) {
    @GetMapping("/api/me/posts")
    fun mine(@AuthenticationPrincipal principal: AuthPrincipal): List<PostSummaryResponse> =
        postService.listMine(principal.userId)

    @PostMapping("/api/me/posts")
    fun create(
        @AuthenticationPrincipal principal: AuthPrincipal,
        @RequestBody body: CreatePostRequest,
    ): PostResponse = postService.create(principal.userId, body)

    @GetMapping("/api/posts/{postId}")
    fun get(
        @PathVariable postId: UUID,
        @AuthenticationPrincipal principal: AuthPrincipal,
    ): PostResponse = postService.get(postId, principal.userId)

    @PatchMapping("/api/posts/{postId}")
    fun update(
        @PathVariable postId: UUID,
        @AuthenticationPrincipal principal: AuthPrincipal,
        @RequestBody body: UpdatePostRequest,
    ): PostResponse = postService.update(postId, principal.userId, body)

    @DeleteMapping("/api/posts/{postId}")
    fun delete(
        @PathVariable postId: UUID,
        @AuthenticationPrincipal principal: AuthPrincipal,
    ): ResponseEntity<Void> {
        postService.delete(postId, principal.userId)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/api/users/{username}/posts")
    fun byUser(
        @PathVariable username: String,
        @AuthenticationPrincipal principal: AuthPrincipal,
    ): List<PostSummaryResponse> = postService.listByUsername(username, principal.userId)

    @GetMapping("/api/studies/{slug}/posts")
    fun byStudy(
        @PathVariable slug: String,
        @AuthenticationPrincipal principal: AuthPrincipal,
    ): List<PostSummaryResponse> {
        membershipGuard.requireStudy(slug, principal.userId)
        return postService.listForStudy(slug, principal.userId)
    }

    @GetMapping("/api/works/{workId}/posts")
    fun byWork(
        @PathVariable workId: UUID,
        @AuthenticationPrincipal principal: AuthPrincipal,
    ): List<PostSummaryResponse> = postService.listForWork(workId, principal.userId)
}
