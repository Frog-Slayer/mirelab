package com.mirelab.application.work

import com.mirelab.domain.work.WorkBlock
import com.mirelab.infra.user.UserRepository
import com.mirelab.infra.work.WorkBlockRepository
import com.mirelab.infra.work.WorkRepository
import java.time.Instant
import java.util.UUID
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class WorkBlockService(
    private val workBlockRepository: WorkBlockRepository,
    private val workRepository: WorkRepository,
    private val userRepository: UserRepository,
) {
    fun list(workId: UUID): List<WorkBlockResponse> =
        workBlockRepository.findByWorkIdOrderByCreatedAt(workId).map { it.toResponse() }

    @Transactional
    fun create(workId: UUID, authorId: UUID, input: CreateWorkBlockRequest): WorkBlockResponse? {
        val work = workRepository.findById(workId).orElse(null) ?: return null
        val author = userRepository.findById(authorId).orElse(null) ?: return null
        val block = WorkBlock(work = work, author = author, title = input.title, createdAt = Instant.now())
        return workBlockRepository.save(block).toResponse()
    }

    /** 쓴 사람만 고칠 수 있다는 건 화면에서 막는다 — 여기는 존재 여부만 확인 */
    @Transactional
    fun updateTitle(blockId: UUID, title: String): Boolean {
        val block = workBlockRepository.findById(blockId).orElse(null) ?: return false
        block.title = title
        workBlockRepository.save(block)
        return true
    }

    @Transactional
    fun remove(blockId: UUID): Boolean {
        if (!workBlockRepository.existsById(blockId)) return false
        workBlockRepository.deleteById(blockId)
        return true
    }
}
