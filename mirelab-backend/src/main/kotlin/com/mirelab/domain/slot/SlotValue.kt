package com.mirelab.domain.slot

import com.mirelab.domain.user.User
import com.mirelab.domain.work.Work
import jakarta.persistence.Column
import jakarta.persistence.Convert
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.util.UUID

/**
 * 칸 값 하나. 붙는 대상은 항상 작품([Work]) 이다 — 모임은 일정만 안다.
 *
 * [value] 는 칸 타입마다 모양이 다른 JSON 이다(`{"n": 4}` · `{"text": "..."}` ·
 * `{"items": [...]}`). 칸 타입이 사용자 마음대로 늘어나니 컬럼을 미리 못 만든다.
 *
 * TODO 내 서재(개인 소장 기록)는 스터디 작품 기록과 값이 겹치면 안 되는데, 지금 프론트
 * 목은 `targetId` 에 `shelf:` 접두어를 붙이는 임시방편을 쓰고 있다. 실제 스키마에서는
 * 이 구분을 어떻게 모델링할지(별도 테이블 vs 구분 컬럼) 아직 정하지 않았다 — 내 서재
 * 화면에 손댈 때 다시 결정한다.
 */
@Entity
@Table(
    name = "slot_values",
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["work_id", "slot_def_id", "user_id"]),
    ],
)
class SlotValue(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "work_id", nullable = false)
    var work: Work,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "slot_def_id", nullable = false)
    var slotDef: SlotDef,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    var user: User,

    // "value" 는 H2 에서 예약어라 컬럼명이 그대로면 DDL 파싱에서 깨진다.
    @Convert(converter = SlotValueJsonConverter::class)
    @Column(name = "value_json", nullable = false, length = 4000)
    var value: Map<String, Any?>,

    var draft: Boolean = true,
)
