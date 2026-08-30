package com.mirelab.infra.session

import com.mirelab.domain.session.Session
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface SessionRepository : JpaRepository<Session, UUID> {
    fun findByStudyId(studyId: UUID): List<Session>

    /** 한 작품에 걸린 회차들 — 오래된 순으로 보여줄 땐 호출부에서 뒤집는다 */
    fun findByWorkId(workId: UUID): List<Session>

    /** 여러 작품의 회차 수를 한 번에 — 책장에서 책마다 따로 쿼리하지 않으려고 */
    fun findByWorkIdIn(workIds: Collection<UUID>): List<Session>
}
