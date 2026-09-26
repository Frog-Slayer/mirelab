package com.mirelab.domain.note

import com.mirelab.domain.user.User
import com.mirelab.domain.work.Work
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
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
 * 작품을 읽으면서 혼자 남기는 메모 한 장. 오직 쓴 사람만 본다 — 스터디에 남는 기록
 * (평점·한줄평·함께 쓰는 기록)과는 다른 자리다.
 *
 * 이 엔티티의 핵심은 **없는 제약**에 있다: (작품, 사람)당 하나라는 제한이 없어서 한 사람이
 * 한 작품에 메모를 얼마든지 쌓을 수 있다. 예전 슬롯 방식은 스터디가 정해 둔 칸마다 값을
 * 하나씩만 담을 수 있어(`unique(work, slot_def, user, context)`) "메모 추가"가 애초에 안 됐다.
 */
@Entity
@Table(name = "work_notes")
class WorkNote(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "work_id", nullable = false)
    var work: Work,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    var author: User,

    // PostgreSQL 네이티브 enum 은 값이 늘 때마다 마이그레이션이 필요해 varchar 로 강제한다
    // (테스트에서 쓰는 H2도 이 방식이 호환된다).
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false)
    var kind: NoteKind,

    // @Lob 을 쓰면 PostgreSQL에서 large object/OID 로 매핑돼 별도 트랜잭션 취급이 필요해진다.
    // LONGVARCHAR 로 지정해 PostgreSQL은 text, H2는 clob 인 평범한 텍스트 컬럼을 쓴다.
    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    @Column(nullable = false, length = 1_000_000)
    var body: String,

    val createdAt: Instant,

    /** 목록 순서는 createdAt 이 정한다 — 이건 "언제 마지막으로 손댔나"를 보여주기 위한 것 */
    var updatedAt: Instant,
)
