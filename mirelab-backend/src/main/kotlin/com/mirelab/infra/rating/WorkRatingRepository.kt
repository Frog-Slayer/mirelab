package com.mirelab.infra.rating

import com.mirelab.domain.rating.WorkRating
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface WorkRatingRepository : JpaRepository<WorkRating, UUID> {
    fun findByWorkId(workId: UUID): List<WorkRating>

    /** 여러 작품을 한 번에 — 명예의 전당·책장은 책마다 이 값이 필요한데 책 수만큼 쿼리하면(N+1) 느려진다 */
    fun findByWorkIdIn(workIds: Collection<UUID>): List<WorkRating>

    /** 저장(upsert) 시 기존 평가가 있는지 찾을 때 */
    fun findByWorkIdAndUserId(workId: UUID, userId: UUID): WorkRating?

    /** 한 사람이 여러 책에 남긴 평가 — 내 서재 목록 */
    fun findByUserIdAndWorkIdIn(userId: UUID, workIds: Collection<UUID>): List<WorkRating>

    /** 작품을 통째로 지울 때 — cascade 없는 NOT NULL FK 라 먼저 떼어내야 한다 */
    fun deleteByWorkId(workId: UUID)
}
