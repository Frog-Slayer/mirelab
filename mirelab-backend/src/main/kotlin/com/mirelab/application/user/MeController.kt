package com.mirelab.application.user

import com.mirelab.auth.AuthPrincipal
import com.mirelab.domain.user.User
import com.mirelab.infra.user.ProfilePictureStorage
import com.mirelab.infra.user.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionSynchronization
import org.springframework.transaction.support.TransactionSynchronizationManager
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
     * 새 사진으로 갈아끼운다. 파일 지우기는 되돌릴 수 없으므로 트랜잭션이 끝나는 것을 보고
     * 정리한다([cleanUpAfterTransaction]) — 커밋됐으면 이전 파일이, 롤백됐으면 방금 저장한
     * 파일이 아무도 가리키지 않는 쪽이 된다.
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
        val saved = profilePictureStorage.save(file.bytes)
        user.pictureFilename = saved
        cleanUpAfterTransaction(onCommit = previous, onRollback = saved)

        return user.toResponse()
    }

    /** 사진을 지우면 이름·색으로 그리는 기본 아바타로 돌아간다 */
    @DeleteMapping("/picture")
    @Transactional
    fun removePicture(@AuthenticationPrincipal principal: AuthPrincipal): UserResponse {
        val user = me(principal)
        val previous = user.pictureFilename
        user.pictureFilename = null
        cleanUpAfterTransaction(onCommit = previous, onRollback = null)

        return user.toResponse()
    }

    /**
     * 트랜잭션이 어느 쪽으로 끝나든, 그 결과 아무도 가리키지 않게 된 파일 하나를 치운다.
     *
     * 트랜잭션 안에서 미리 지우면 이후 롤백됐을 때 DB 는 옛 파일을 가리키는데 파일은 이미
     * 없는 상태가 된다 — flush 를 먼저 해도 커밋 전이라 마찬가지다.
     */
    private fun cleanUpAfterTransaction(onCommit: String?, onRollback: String?) {
        if (onCommit == null && onRollback == null) return
        TransactionSynchronizationManager.registerSynchronization(
            object : TransactionSynchronization {
                override fun afterCompletion(status: Int) {
                    val committed = status == TransactionSynchronization.STATUS_COMMITTED
                    profilePictureStorage.delete(if (committed) onCommit else onRollback)
                }
            },
        )
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
