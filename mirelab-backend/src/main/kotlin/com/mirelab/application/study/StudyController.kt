package com.mirelab.application.study

import com.mirelab.application.user.UserResponse
import java.util.UUID
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/studies")
class StudyController(private val studyService: StudyService) {

    /** 로그인 전이라 헤더로 현재 사용자를 받는다 — design.md 3장 "인증은 나중에" */
    @GetMapping("/mine")
    fun mine(@RequestHeader("X-User-Id") userId: UUID): List<StudyResponse> =
        studyService.findMine(userId)

    @GetMapping("/{slug}")
    fun bySlug(@PathVariable slug: String): ResponseEntity<StudyResponse> =
        studyService.findBySlug(slug)?.let { ResponseEntity.ok(it) }
            ?: ResponseEntity.notFound().build()

    @GetMapping("/{slug}/members")
    fun members(@PathVariable slug: String): List<UserResponse> = studyService.listMembers(slug)
}
