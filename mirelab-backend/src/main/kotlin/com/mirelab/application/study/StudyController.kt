package com.mirelab.application.study

import com.mirelab.application.user.UserResponse
import com.mirelab.auth.AuthPrincipal
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/studies")
class StudyController(private val studyService: StudyService) {

    @GetMapping("/mine")
    fun mine(@AuthenticationPrincipal principal: AuthPrincipal): List<StudyResponse> =
        studyService.findMine(principal.userId)

    @GetMapping("/{slug}")
    fun bySlug(@PathVariable slug: String): ResponseEntity<StudyResponse> =
        studyService.findBySlug(slug)?.let { ResponseEntity.ok(it) }
            ?: ResponseEntity.notFound().build()

    @GetMapping("/{slug}/members")
    fun members(@PathVariable slug: String): List<UserResponse> = studyService.listMembers(slug)
}
