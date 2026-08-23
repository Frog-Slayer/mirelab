package com.mirelab.application.session

import com.mirelab.application.work.WorkResponse
import com.mirelab.application.work.toResponse
import com.mirelab.domain.session.Session
import com.mirelab.domain.work.WorkStatus
import com.mirelab.infra.session.SessionRepository
import com.mirelab.infra.study.StudyRepository
import com.mirelab.infra.work.WorkRepository
import java.time.Instant
import java.util.UUID
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class SessionService(
    private val sessionRepository: SessionRepository,
    private val workRepository: WorkRepository,
    private val studyRepository: StudyRepository,
) {
    /** "시작"·"일정 추가" — 모임이 잡히면 그 작품은 읽는 중이 된다 */
    @Transactional
    fun addForWork(workId: UUID, meetAt: Instant?): SessionResponse? {
        val work = workRepository.findById(workId).orElse(null) ?: return null
        val study = work.study ?: return null

        val session = sessionRepository.save(Session(study = study, work = work, meetAt = meetAt, closed = false))

        if (work.status == WorkStatus.CANDIDATE) {
            // "시작하기"를 누른 이 순간이 작품 목록에서 진행 중 줄을 세우는 기준이 된다
            work.moveTo(WorkStatus.READING)
            workRepository.save(work)
        }
        return session.toResponse()
    }

    /** 날짜가 잡힌 회차만 달력에 올라온다 — 휴회·뒤풀이 같은 일정은 아직 없다 */
    @Transactional(readOnly = true)
    fun schedule(slug: String): List<ScheduleItemResponse> {
        val study = studyRepository.findBySlug(slug) ?: return emptyList()
        return sessionRepository.findByStudyId(study.id!!)
            .filter { it.meetAt != null }
            .sortedBy { it.meetAt }
            .map {
                ScheduleItemResponse(
                    sessionId = it.id!!,
                    workId = it.work?.id,
                    title = it.work?.title ?: "모임",
                    meetAt = it.meetAt!!,
                    closed = it.closed,
                )
            }
    }

    /**
     * 진행 중인 회차 = 안 끝난 것 중 가장 가까운 날. 날짜 미정은 뒤로 민다.
     *
     * closed 를 지나간 회차로 자동으로 바꿔주는 경로가 아직 없어서(회차를 "닫는"
     * 기능 자체가 없다), meetAt 이 이미 지난 회차까지 여기서 걸러야 한다 — 안 그러면
     * 새 회차를 잡아도 지난 회차의 meetAt 이 더 이르다는 이유로 계속 그 지난 회차가
     * 뜬다.
     */
    @Transactional(readOnly = true)
    fun currentSession(slug: String): CurrentSessionResponse? {
        val study = studyRepository.findBySlug(slug) ?: return null
        val now = Instant.now()
        val session = sessionRepository.findByStudyId(study.id!!)
            .filter { !it.closed && (it.meetAt == null || !it.meetAt!!.isBefore(now)) }
            .minByOrNull { it.meetAt ?: Instant.MAX }
            ?: return null
        return CurrentSessionResponse(session.toResponse(), session.work?.toResponse())
    }
}

data class ScheduleItemResponse(
    val sessionId: UUID,
    val workId: UUID?,
    val title: String,
    val meetAt: Instant,
    val closed: Boolean,
)

data class CurrentSessionResponse(
    val session: SessionResponse,
    val work: WorkResponse?,
)
