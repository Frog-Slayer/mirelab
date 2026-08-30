package com.mirelab.application.study

import com.mirelab.infra.note.WorkNoteRepository
import com.mirelab.infra.study.StudyMemberRepository
import com.mirelab.infra.study.StudyRepository
import com.mirelab.infra.work.WorkBlockRepository
import com.mirelab.infra.work.WorkRepository
import com.mirelab.infra.user.UserRepository
import com.mirelab.domain.user.Role
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException

/** 스터디 데이터 REST API가 공유하는 단일 멤버십 접근 경계. */
@Service
class StudyMembershipGuard(
    private val studyRepository: StudyRepository,
    private val studyMemberRepository: StudyMemberRepository,
    private val workRepository: WorkRepository,
    private val workBlockRepository: WorkBlockRepository,
    private val workNoteRepository: WorkNoteRepository,
    private val userRepository: UserRepository,
) {
    @Transactional(readOnly = true)
    fun requireStudy(slug: String, userId: UUID) {
        val study = studyRepository.findBySlug(slug)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "없는 스터디입니다")
        requireMembership(requireNotNull(study.id), userId)
    }

    @Transactional(readOnly = true)
    fun requireWork(workId: UUID, userId: UUID) {
        val work = workRepository.findById(workId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "없는 작품입니다")
        }
        val studyId = work.study?.id
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "스터디 작품이 아닙니다")
        requireMembership(studyId, userId)
    }

    /**
     * 메모는 여기서 "이 스터디 사람인가"까지만 본다 — "내 메모인가"는 [WorkNoteService] 가
     * 따로 가린다. 멤버라도 남의 메모는 못 보는 게 그쪽 규칙이라 관문 하나로는 안 된다.
     */
    @Transactional(readOnly = true)
    fun requireNote(noteId: UUID, userId: UUID) {
        val note = workNoteRepository.findById(noteId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "없는 메모입니다")
        }
        val studyId = note.work.study?.id
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "스터디 작품의 메모가 아닙니다")
        requireMembership(studyId, userId)
    }

    @Transactional(readOnly = true)
    fun requireBlock(blockId: UUID, userId: UUID) {
        val block = workBlockRepository.findById(blockId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "없는 기록 블록입니다")
        }
        val studyId = block.work.study?.id
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "스터디 기록이 아닙니다")
        requireMembership(studyId, userId)
    }

    private fun requireMembership(studyId: UUID, userId: UUID) {
        if (userRepository.findById(userId).orElse(null)?.role == Role.ADMIN) return
        if (!studyMemberRepository.existsByStudyIdAndUserId(studyId, userId)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "이 스터디의 멤버만 접근할 수 있습니다")
        }
    }
}
