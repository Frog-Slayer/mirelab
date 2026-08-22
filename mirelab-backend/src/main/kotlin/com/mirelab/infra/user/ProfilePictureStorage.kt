package com.mirelab.infra.user

import java.nio.file.Files
import java.nio.file.NoSuchFileException
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import java.util.UUID
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException

/** 저장을 허용하는 이미지 형식 — 확장자와 내려줄 때 쓸 Content-Type */
private enum class ImageFormat(val extension: String, val contentType: String) {
    PNG("png", "image/png"),
    JPEG("jpg", "image/jpeg"),
    WEBP("webp", "image/webp"),
}

/**
 * 프로필 사진을 서버 볼륨에 두고 읽고 지운다.
 *
 * DB 대신 파일로 두는 이유: 사진은 요청마다 통째로 나가는 정적 바이트라, DB 커넥션을
 * 잡아두는 것도 백업 덤프를 무겁게 만드는 것도 얻는 게 없다. 대신 볼륨을 잃으면 사진도
 * 잃으므로 [com.mirelab.domain.user.User.pictureFilename] 은 항상 "있을 수도 없을 수도"
 * 있는 값으로 다룬다 — 파일이 사라져도 기본 아바타로 떨어질 뿐 화면이 깨지지 않는다.
 */
@Service
class ProfilePictureStorage(
    @Value("\${mirelab.profile-picture-dir}") directory: String,
) {
    private val dir: Path = Path.of(directory).toAbsolutePath().normalize()

    init {
        // 못 만들면 여기서 죽는 게 낫다 — 첫 업로드 때가 아니라 부팅 때 알아야 고칠 수 있다.
        Files.createDirectories(dir)
    }

    /**
     * 새 파일로 저장하고 그 이름을 돌려준다.
     *
     * 브라우저가 보낸 Content-Type 은 믿지 않고 앞부분 바이트로 형식을 가린다. 이 파일은
     * 나중에 그대로 다시 내려가므로, 이미지인 척하는 HTML·SVG 를 받아두면 우리 origin 에서
     * 스크립트가 실행된다.
     */
    fun save(bytes: ByteArray): String {
        val format = detect(bytes)
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "PNG·JPEG·WebP 이미지만 올릴 수 있습니다")

        val filename = "${UUID.randomUUID()}.${format.extension}"
        val temp = Files.createTempFile(dir, "upload-", ".part")
        return try {
            Files.write(temp, bytes)
            // 반쯤 쓰인 파일이 잠깐이라도 정식 이름으로 보이지 않게 다 쓴 뒤 옮긴다
            Files.move(temp, dir.resolve(filename), StandardCopyOption.ATOMIC_MOVE)
            filename
        } catch (e: Exception) {
            Files.deleteIfExists(temp)
            throw e
        }
    }

    /** 파일이 이미 없어도 조용히 넘어간다 — 지우는 게 목적이지 존재를 확인하는 게 아니다 */
    fun delete(filename: String?) {
        val path = resolve(filename ?: return) ?: return
        Files.deleteIfExists(path)
    }

    fun read(filename: String): ByteArray? {
        val path = resolve(filename) ?: return null
        return try {
            Files.readAllBytes(path)
        } catch (_: NoSuchFileException) {
            null
        }
    }

    fun contentTypeOf(filename: String): String =
        ImageFormat.entries.find { filename.endsWith(".${it.extension}") }?.contentType
            ?: "application/octet-stream"

    /**
     * 우리가 만든 이름 모양이 아니면 파일시스템을 건드리지 않는다 — `..` 이 섞인 이름 하나로
     * 디렉터리 밖 파일을 읽거나 지우게 되는 걸 이 한 줄로 막는다.
     */
    private fun resolve(filename: String): Path? =
        if (FILENAME.matches(filename)) dir.resolve(filename) else null

    private fun detect(bytes: ByteArray): ImageFormat? = when {
        bytes.startsWith(0x89, 0x50, 0x4E, 0x47) -> ImageFormat.PNG
        bytes.startsWith(0xFF, 0xD8, 0xFF) -> ImageFormat.JPEG
        // WebP 는 RIFF 컨테이너라 12바이트째부터 오는 "WEBP" 까지 봐야 구분된다
        bytes.startsWith(0x52, 0x49, 0x46, 0x46) && bytes.size > 15 &&
            bytes.copyOfRange(8, 12).contentEquals("WEBP".toByteArray()) -> ImageFormat.WEBP
        else -> null
    }

    private fun ByteArray.startsWith(vararg prefix: Int): Boolean =
        size >= prefix.size && prefix.withIndex().all { (i, b) -> this[i] == b.toByte() }

    private companion object {
        val FILENAME = Regex("^[0-9a-f-]{36}\\.(png|jpg|webp)$")
    }
}
