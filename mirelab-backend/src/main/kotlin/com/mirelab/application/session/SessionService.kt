package com.mirelab.application.session

import com.mirelab.domain.session.Session
import com.mirelab.domain.work.WorkStatus
import com.mirelab.infra.session.SessionRepository
import com.mirelab.infra.work.WorkRepository
import java.time.Instant
import java.util.UUID
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class SessionService(
    private val sessionRepository: SessionRepository,
    private val workRepository: WorkRepository,
) {
    /** "시작"·"일정 추가" — 모임이 잡히면 그 작품은 읽는 중이 된다 */
    @Transactional
    fun addForWork(workId: UUID, meetAt: Instant?): SessionResponse? {
        val work = workRepository.findById(workId).orElse(null) ?: return null
        val study = work.study ?: return null

        val session = sessionRepository.save(Session(study = study, work = work, meetAt = meetAt, closed = false))

        if (work.status == WorkStatus.CANDIDATE) {
            work.status = WorkStatus.READING
            workRepository.save(work)
        }
        return session.toResponse()
    }
}
