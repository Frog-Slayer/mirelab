package com.mirelab.infra.note

import com.mirelab.domain.note.WorkNote
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface WorkNoteRepository : JpaRepository<WorkNote, UUID> {
    /** 한 작품에 내가 남긴 메모 전부, 쓴 순서대로. 남의 메모는 애초에 안 읽는다 */
    fun findByWorkIdAndAuthorIdOrderByCreatedAt(workId: UUID, authorId: UUID): List<WorkNote>

    /** 작품을 통째로 지울 때 — cascade 없는 NOT NULL FK 라 먼저 떼어내야 한다 */
    fun deleteByWorkId(workId: UUID)
}
