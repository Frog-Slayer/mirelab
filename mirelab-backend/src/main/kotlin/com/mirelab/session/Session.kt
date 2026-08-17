package com.mirelab.session

import com.mirelab.study.Study
import com.mirelab.work.Work
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

/**
 * 모임 — 만나는 일정 하나. 장 구분·순번은 두지 않는다: 기록은 전부 [Work] 에
 * 쌓이므로, 모임은 "언제 만나는가"만 안다.
 */
@Entity
@Table(name = "sessions")
class Session(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "study_id", nullable = false)
    var study: Study,

    /** 작품을 다루는 스터디에서만 */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_id")
    var work: Work? = null,

    /**
     * 모임 일시. 정해진 주기가 없어 매번 다르므로 만들 때는 비워둘 수 있다.
     * 미정이면 일정 탭에서 후보를 놓고 조율해 확정한다.
     */
    var meetAt: Instant? = null,

    var closed: Boolean = false,
)
