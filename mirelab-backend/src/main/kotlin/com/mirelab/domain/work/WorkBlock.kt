package com.mirelab.domain.work

import com.mirelab.domain.user.User
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes

/**
 * 작품에 다 같이 남기는 자유 형식 기록. 게시판처럼 계속 쌓인다.
 *
 * [bodySnapshot] 은 본문의 Yjs 최종 저장본(바이너리)이다 — 실시간 편집 중인 변경 조각은
 * Node 릴레이 서버가 중계하고, Spring 은 유휴 시점에 넘어오는 스냅샷만 갈아끼운다.
 * 아직 아무도 쓰지 않은 새 블록은 null.
 */
@Entity
@Table(name = "work_blocks")
class WorkBlock(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "work_id", nullable = false)
    var work: Work,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    var author: User,

    var title: String,

    // @Lob 을 쓰면 PostgreSQL에서 large object/OID 로 매핑돼버린다 — VARBINARY 로 지정해
    // PostgreSQL은 bytea, 테스트에서 쓰는 H2는 평범한 바이너리 컬럼을 쓴다(WorkNote.body 와 같은 이유).
    @JdbcTypeCode(SqlTypes.VARBINARY)
    var bodySnapshot: ByteArray? = null,

    val createdAt: Instant,
)
