package com.mirelab.application.user

import com.mirelab.auth.AuthPrincipal
import com.mirelab.domain.user.User
import com.mirelab.infra.user.ProfilePictureStorage
import com.mirelab.infra.user.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException

data class UpdateMeRequest(val name: String)

/**
 * 내 계정 정보 고치기. 남의 계정을 건드릴 길이 아예 없도록 대상 id 를 받지 않고
 * 토큰의 주체만 쓴다 — 경로에 id 가 없으면 "남의 id 를 넣어보는" 시도 자체가 성립하지 않는다.
 */
@RestController
@RequestMapping("/api/me")
class MeController(
    private val userRepository: UserRepository,
    private val profilePictureStorage: ProfilePictureStorage,
) {

    @PatchMapping
    @Transactional
    fun update(
        @AuthenticationPrincipal principal: AuthPrincipal,
        @RequestBody body: UpdateMeRequest,
    ): UserResponse {
        val name = body.name.trim()
        if (name.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "이름을 입력해 주세요")
        }
        if (name.length > MAX_NAME_LENGTH) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "이름은 ${MAX_NAME_LENGTH}자까지 쓸 수 있습니다")
        }

        val user = me(principal)
        user.name = name
        return user.toResponse()
    }

    /**
     * 새 사진으로 갈아끼운다. 이전 파일은 DB 를 고친 뒤에 지운다 — 순서를 뒤집으면 저장에
     * 실패했을 때 사진만 사라진 계정이 남는다.
     */
    @PutMapping("/picture")
    @Transactional
    fun uploadPicture(
        @AuthenticationPrincipal principal: AuthPrincipal,
        @RequestParam("file") file: MultipartFile,
    ): UserResponse {
        if (file.isEmpty) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "이미지를 골라 주세요")
        }
        if (file.size > MAX_PICTURE_BYTES) {
            throw ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "사진은 2MB 까지 올릴 수 있습니다")
        }

        val user = me(principal)
        val previous = user.pictureFilename
        user.pictureFilename = profilePictureStorage.save(file.bytes)
        userRepository.flush()
        profilePictureStorage.delete(previous)

        return user.toResponse()
    }

    /** 사진을 지우면 이름·색으로 그리는 기본 아바타로 돌아간다 */
    @DeleteMapping("/picture")
    @Transactional
    fun removePicture(@AuthenticationPrincipal principal: AuthPrincipal): UserResponse {
        val user = me(principal)
        val previous = user.pictureFilename
        user.pictureFilename = null
        userRepository.flush()
        profilePictureStorage.delete(previous)

        return user.toResponse()
    }

    private fun me(principal: AuthPrincipal): User =
        userRepository.findById(principal.userId).orElseThrow {
            ResponseStatusException(HttpStatus.UNAUTHORIZED, "없는 계정입니다")
        }

    private companion object {
        const val MAX_NAME_LENGTH = 40
        const val MAX_PICTURE_BYTES = 2L * 1024 * 1024
    }
}
