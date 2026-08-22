package com.mirelab.application

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.multipart.MaxUploadSizeExceededException
import org.springframework.web.server.ResponseStatusException

/**
 * 우리가 일부러 붙인 오류 문구를 사람이 읽을 수 있게 내보낸다.
 *
 * [ResponseStatusException] 의 reason 은 기본 설정(`server.error.include-message=never`)에서는
 * 응답에 실리지 않는다 — "이름을 입력해 주세요" 같은 문구를 정성껏 써놔도 프론트
 * (`lib/api.ts` 의 apiErrorMessage)에는 빈 본문이 도착해 늘 일반 문구로 대체됐다.
 *
 * 그렇다고 include-message 를 always 로 열지는 않는다. 그러면 우리가 쓴 적 없는 예외 메시지
 * (드라이버·프레임워크가 던지는 것들)까지 그대로 나가 내부 사정이 새기 때문이다. 여기서
 * 내보낼 문구만 골라 담는 편이 안전하다.
 *
 * 본문 모양은 SecurityConfig 의 401·403 응답과 같은 `{"message": "..."}` 하나로 맞춘다 —
 * 프론트가 아는 모양이 하나여야 한다.
 */
@RestControllerAdvice
class ApiErrorHandler {

    @ExceptionHandler(ResponseStatusException::class)
    fun handle(exception: ResponseStatusException): ResponseEntity<Map<String, String>> {
        val builder = ResponseEntity.status(exception.statusCode).headers(exception.headers)
        val reason = exception.reason ?: return builder.build()
        return builder.body(mapOf("message" to reason))
    }

    /**
     * 톰캣이 multipart 한도에서 먼저 자른 경우. 컨트롤러의 크기 검사까지 가지도 못하므로
     * 그 자리에서 같은 뜻의 문구를 돌려준다 — 안 그러면 사용자에게는 원인 모를 500 이 뜬다.
     */
    @ExceptionHandler(MaxUploadSizeExceededException::class)
    fun handleTooLarge(): ResponseEntity<Map<String, String>> =
        ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
            .body(mapOf("message" to "사진이 너무 큽니다. 2MB 까지 올릴 수 있습니다"))
}
