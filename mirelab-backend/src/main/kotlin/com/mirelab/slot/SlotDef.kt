package com.mirelab.slot

import com.mirelab.session.Session
import com.mirelab.study.Study
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
import java.util.UUID
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes

/**
 * 칸 정의. 지금 범위는 개인별 칸만 다룬다 — 공동 칸(항목 목록+메모)은 제외했다.
 */
@Entity
@Table(name = "slot_defs")
class SlotDef(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "study_id", nullable = false)
    var study: Study,

    var name: String,

    // H2 가 네이티브 enum DDL 문법을 못 읽어서, varchar 로 저장하도록 강제한다.
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false)
    var type: SlotType,

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false)
    var visibility: Visibility,

    /** 스터디 기본 칸인지, 특정 모임에만 나오는 콜아웃인지 */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false)
    var owner: SlotOwner,

    /** owner 가 SESSION 일 때만 채워진다 */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    var session: Session? = null,

    /** 작품 화면에 그려지는 순서 */
    @Column(name = "sort_order", nullable = false)
    var sortOrder: Int,

    /** 지우지 않고 숨긴다 — 과거 기록은 남아야 한다 */
    var hidden: Boolean = false,
)
