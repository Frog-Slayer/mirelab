package com.mirelab.work

import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface WorkBlockRepository : JpaRepository<WorkBlock, UUID> {
    /** 게시판처럼 쌓이므로 먼저 쓴 순으로 */
    fun findByWorkIdOrderByCreatedAt(workId: UUID): List<WorkBlock>
}
