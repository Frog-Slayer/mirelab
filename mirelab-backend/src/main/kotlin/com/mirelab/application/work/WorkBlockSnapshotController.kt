package com.mirelab.application.work

import com.mirelab.infra.work.WorkBlockRepository
import java.util.UUID
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

/**
 * Node 실시간 릴레이 서버 전용 내부 API — Node는 무상태 릴레이만 하고, Yjs 문서의
 * 최종 저장본은 여기서 Postgres 에 보관한다(design.md 5장 "Spring은 받아서 뿌리고
 * 저장만 한다"). Node 는 방(room)이 처음 열릴 때 GET 으로 스냅샷을 받아 문서를
 * 복원하고, 마지막 접속자가 나갈 때 POST 로 병합된 최종 상태를 밀어넣는다.
 *
 * 사용자 토큰으로는 인증할 수 없는 경로라(부르는 쪽이 사람이 아니다) 공유 시크릿 헤더로
 * 막는다 — [com.mirelab.auth.InternalApiFilter] 참고. 접속 권한 판정은 별도로
 * [WorkBlockAccessController] 가 사용자 토큰까지 받아서 한다.
 */
@RestController
class WorkBlockSnapshotController(private val workBlockRepository: WorkBlockRepository) {

    @GetMapping("/internal/blocks/{blockId}/snapshot")
    fun get(@PathVariable blockId: UUID): ResponseEntity<ByteArray> {
        val block = workBlockRepository.findById(blockId).orElse(null) ?: return ResponseEntity.notFound().build()
        val snapshot = block.bodySnapshot ?: return ResponseEntity.noContent().build()
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM).body(snapshot)
    }

    @Transactional
    @PostMapping("/internal/blocks/{blockId}/snapshot")
    fun put(@PathVariable blockId: UUID, @RequestBody bytes: ByteArray): ResponseEntity<Void> {
        val block = workBlockRepository.findById(blockId).orElse(null) ?: return ResponseEntity.notFound().build()
        block.bodySnapshot = bytes
        workBlockRepository.save(block)
        return ResponseEntity.noContent().build()
    }

    /**
     * 아직 아무 내용도 안 쓰인 문서는(빈 문단 하나뿐이어도) Yjs 인코딩 결과가 빈 바이트
     * 배열이 아니다 — Node 가 "진짜 내용이 있나"를 판단해서, 없으면 POST 대신 이걸
     * 불러 스냅샷을 지운다. hasContent 는 여전히 null 여부로만 판단해도 되게 해준다.
     */
    @Transactional
    @DeleteMapping("/internal/blocks/{blockId}/snapshot")
    fun clear(@PathVariable blockId: UUID): ResponseEntity<Void> {
        val block = workBlockRepository.findById(blockId).orElse(null) ?: return ResponseEntity.notFound().build()
        block.bodySnapshot = null
        workBlockRepository.save(block)
        return ResponseEntity.noContent().build()
    }
}
