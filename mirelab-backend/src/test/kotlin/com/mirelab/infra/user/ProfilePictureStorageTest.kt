package com.mirelab.infra.user

import java.nio.file.Files
import java.nio.file.Path
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue
import org.junit.jupiter.api.io.TempDir
import org.springframework.web.server.ResponseStatusException

class ProfilePictureStorageTest {

    @TempDir
    lateinit var dir: Path

    private fun storage() = ProfilePictureStorage(dir.toString())

    /** 형식은 확장자나 Content-Type 이 아니라 앞부분 바이트로만 가린다 */
    private fun png(payload: String = "png") =
        byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47) + payload.toByteArray()

    private fun webp() =
        "RIFF".toByteArray() + ByteArray(4) + "WEBP".toByteArray() + ByteArray(8)

    @Test
    fun `저장한 사진을 이름으로 다시 읽는다`() {
        val storage = storage()
        val bytes = png()

        val filename = storage.save(bytes)

        assertTrue(filename.endsWith(".png"), filename)
        assertContentEquals(bytes, storage.read(filename))
    }

    @Test
    fun `WebP 도 알아본다`() {
        assertTrue(storage().save(webp()).endsWith(".webp"))
    }

    @Test
    fun `이미지가 아닌 바이트는 거절한다`() {
        // 이미지인 척하는 HTML 을 받아두면 우리 origin 에서 스크립트가 돌아간다
        val html = "<html><script>alert(1)</script>".toByteArray()

        assertFailsWith<ResponseStatusException> { storage().save(html) }
        assertTrue(Files.list(dir).use { it.count() } == 0L, "거절한 파일이 남으면 안 된다")
    }

    @Test
    fun `지우면 파일도 사라지고 이미 없어도 조용하다`() {
        val storage = storage()
        val filename = storage.save(png())

        storage.delete(filename)

        assertNull(storage.read(filename))
        storage.delete(filename)
        storage.delete(null)
    }

    @Test
    fun `디렉터리 밖을 가리키는 이름은 읽지도 지우지도 않는다`() {
        val storage = storage()
        val outside = dir.resolve("../secret.png").normalize()
        Files.write(outside, png("secret"))

        assertNull(storage.read("../secret.png"))
        storage.delete("../secret.png")

        assertTrue(Files.exists(outside), "디렉터리 밖 파일이 지워졌다")
        Files.delete(outside)
    }
}
