package com.mirelab.application.user

import com.mirelab.infra.user.ProfilePictureStorage
import java.time.Duration
import org.springframework.http.CacheControl
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RestController

/**
 * 프로필 사진 내려주기.
 *
 * 인증을 걸지 않는다: `<img src>` 는 Authorization 헤더를 실을 수 없고(우리 access token 은
 * 메모리에만 있다), 그렇다고 사진마다 fetch → blob URL 로 우회하면 캐시가 통째로 죽는다.
 * 대신 파일 이름이 무작위 UUID 라 주소를 모르면 꺼낼 수 없다 — 스터디 멤버 프로필 사진에
 * 맞는 수준의 보호다.
 *
 * 이름이 바뀌면 URL 도 바뀌므로 캐시는 영구로 건다.
 */
@RestController
class ProfilePictureController(
    private val profilePictureStorage: ProfilePictureStorage,
) {

    @GetMapping("/api/profile-pictures/{filename}")
    fun picture(@PathVariable filename: String): ResponseEntity<ByteArray> {
        val bytes = profilePictureStorage.read(filename)
            ?: return ResponseEntity.notFound().build()

        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(profilePictureStorage.contentTypeOf(filename)))
            .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
            .body(bytes)
    }
}
