package com.mirelab.application.user

import com.mirelab.auth.AuthPrincipal
import com.mirelab.domain.user.Role
import com.mirelab.domain.user.User
import com.mirelab.infra.user.ProfilePictureStorage
import com.mirelab.infra.user.UserRepository
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.mock.web.MockMultipartFile
import org.springframework.web.server.ResponseStatusException

/**
 * 테스트를 트랜잭션으로 감싸지 않는다 — 사진 파일 정리는 트랜잭션이 끝나는 것을 보고
 * 일어나므로(MeController 의 cleanUpAfterTransaction), 테스트가 트랜잭션을 붙들고 있으면
 * 정리가 아예 일어나지 않거나 롤백 쪽으로 일어난다. 대신 남는 행과 파일을 직접 치운다.
 */
@SpringBootTest
class MeControllerTest @Autowired constructor(
    private val controller: MeController,
    private val userRepository: UserRepository,
    private val profilePictureStorage: ProfilePictureStorage,
) {
    private lateinit var me: User

    private val png = byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47, 1, 2, 3)

    @BeforeEach
    fun setUp() {
        me = userRepository.save(
            User(name = "예전 이름", color = "bg-sky-500", email = "me@example.com", role = Role.MEMBER),
        )
    }

    @AfterEach
    fun tearDown() {
        userRepository.findById(requireNotNull(me.id)).ifPresent { user ->
            profilePictureStorage.delete(user.pictureFilename)
            userRepository.delete(user)
        }
    }

    private fun principal() = AuthPrincipal(userId = requireNotNull(me.id), name = me.name, role = me.role)

    private fun upload(bytes: ByteArray) =
        controller.uploadPicture(principal(), MockMultipartFile("file", "a.png", "image/png", bytes))

    @Test
    fun `이름을 바꾸면 앞뒤 공백은 정리된다`() {
        val updated = controller.update(principal(), UpdateMeRequest("  새 이름  "))

        assertEquals("새 이름", updated.name)
        assertEquals("새 이름", userRepository.findById(requireNotNull(me.id)).get().name)
    }

    @Test
    fun `빈 이름은 거절한다`() {
        assertFailsWith<ResponseStatusException> { controller.update(principal(), UpdateMeRequest("   ")) }
    }

    @Test
    fun `사진을 올리면 경로가 생기고 다시 올리면 이전 파일은 지워진다`() {
        val first = upload(png)
        val firstUrl = assertNotNull(first.pictureUrl)
        val firstFile = firstUrl.substringAfterLast('/')
        assertNotNull(profilePictureStorage.read(firstFile))

        val second = upload(png)
        val secondUrl = assertNotNull(second.pictureUrl)

        assertNotNull(profilePictureStorage.read(secondUrl.substringAfterLast('/')))
        assertNull(profilePictureStorage.read(firstFile), "갈아끼운 뒤 이전 파일이 남았다")
    }

    @Test
    fun `사진을 지우면 기본 아바타로 돌아간다`() {
        val filename = assertNotNull(upload(png).pictureUrl).substringAfterLast('/')

        val cleared = controller.removePicture(principal())

        assertNull(cleared.pictureUrl)
        assertNull(profilePictureStorage.read(filename))
    }

    @Test
    fun `이미지가 아니면 올라가지 않고 원래 사진도 그대로다`() {
        val before = assertNotNull(upload(png).pictureUrl)

        assertFailsWith<ResponseStatusException> { upload("<html>".toByteArray()) }

        assertEquals(before, userRepository.findById(requireNotNull(me.id)).get().let {
            profilePictureUrl(it.pictureFilename)
        })
    }
}
