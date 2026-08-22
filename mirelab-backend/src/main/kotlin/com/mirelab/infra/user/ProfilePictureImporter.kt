package com.mirelab.infra.user

import java.io.InputStream
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

/**
 * 구글 프로필 사진을 우리 볼륨으로 한 번 복사해 온다 — 가입을 마칠 때 기본 사진으로 쓴다.
 *
 * URL 을 그대로 들고 있지 않는 이유: 구글이 주는 주소는 계정 설정이 바뀌면 조용히 404 가 되고,
 * 살아 있는 동안에는 우리 화면을 열 때마다 구글에 요청이 나가 누가 무엇을 보고 있는지가 새어 나간다.
 * 한 번 받아 두면 그 뒤로는 다른 사진과 똑같이 다뤄진다 — 사용자가 바꾸면 그냥 갈아끼워진다.
 */
@Service
class ProfilePictureImporter(
    private val storage: ProfilePictureStorage,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    // 리다이렉트는 https 안에서만 따라간다(NORMAL) — 구글 사진 주소는 CDN 으로 한 번 튄다.
    private val http = HttpClient.newBuilder()
        .connectTimeout(CONNECT_TIMEOUT)
        .followRedirects(HttpClient.Redirect.NORMAL)
        .build()

    private val timeouts = Executors.newSingleThreadScheduledExecutor { runnable ->
        Thread(runnable, "profile-picture-import-timeout").apply { isDaemon = true }
    }

    /**
     * 받아서 저장한 파일 이름. 못 받으면 null 이다 — 사진 한 장 때문에 가입이 막히면 안 되므로
     * 어떤 실패도 예외로 올리지 않고 기본 아바타로 떨어뜨린다.
     */
    fun importFrom(url: String?): String? {
        if (url.isNullOrBlank()) return null

        val uri = runCatching { URI.create(url) }.getOrNull() ?: return null
        if (!uri.scheme.equals("https", ignoreCase = true)) return null

        return try {
            val response = http.send(
                HttpRequest.newBuilder(uri).timeout(RESPONSE_TIMEOUT).GET().build(),
                HttpResponse.BodyHandlers.ofInputStream(),
            )
            if (response.statusCode() != 200) return null

            // 한도보다 딱 한 바이트만 더 읽어 본다 — 넘치면 통째로 버린다.
            // 전부 메모리에 담는 경로라 상대가 무한정 흘려보내는 걸 여기서 끊어야 한다.
            val bytes = readWithin(response.body())
            if (bytes.size > MAX_BYTES) return null

            storage.save(bytes)
        } catch (e: Exception) {
            // 이미지가 아니거나(save 가 거절), 느리거나, 끊겼거나 — 처리는 다 같다.
            log.warn("구글 프로필 사진을 가져오지 못했습니다: {}", e.message)
            null
        }
    }

    /**
     * [HttpRequest.timeout] 은 응답이 오기 시작할 때까지만 재 준다 — 그 뒤 본문을 조금씩
     * 흘려보내는 상대에게는 걸리지 않아서, 이 읽기는 원래 끝나지 않을 수도 있었다. 시간이
     * 지나면 스트림을 밖에서 닫아 읽기를 깨운다.
     */
    private fun readWithin(body: InputStream): ByteArray {
        val cutOff = timeouts.schedule(
            { runCatching { body.close() } },
            BODY_TIMEOUT.toMillis(),
            TimeUnit.MILLISECONDS,
        )
        return try {
            body.use { it.readNBytes(MAX_BYTES + 1) }
        } finally {
            cutOff.cancel(false)
        }
    }

    private companion object {
        val CONNECT_TIMEOUT: Duration = Duration.ofSeconds(3)
        val RESPONSE_TIMEOUT: Duration = Duration.ofSeconds(5)
        val BODY_TIMEOUT: Duration = Duration.ofSeconds(10)
        const val MAX_BYTES = 2 * 1024 * 1024
    }
}
