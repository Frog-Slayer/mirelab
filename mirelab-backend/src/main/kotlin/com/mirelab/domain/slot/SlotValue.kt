package com.mirelab.domain.slot

import com.mirelab.domain.user.User
import com.mirelab.domain.work.Work
import jakarta.persistence.Column
import jakarta.persistence.Convert
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.Lob
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.util.UUID
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes

/**
 * 칸 값 하나. 붙는 대상은 항상 작품([Work]) 이다 — 모임은 일정만 안다.
 *
 * [value] 는 칸 타입마다 모양이 다른 JSON 이다(`{"n": 4}` · `{"text": "..."}` ·
 * `{"items": [...]}`). 칸 타입이 사용자 마음대로 늘어나니 컬럼을 미리 못 만든다.
 *
 * 같은 (work, slotDef, user) 라도 스터디 공식 기록과 내 서재 개인 기록은 다른 값일 수
 * 있어([SlotValueContext] 참고), 그 셋만으로는 유일하지 않다 — context 까지 넣어야 한다.
 */
@Entity
@Table(
    name = "slot_values",
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["work_id", "slot_def_id", "user_id", "context"]),
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
    // BlockNote 문서는 블록마다 id·props·styles 가 붙어 금방 커지므로 VARCHAR 로 못 담는다.
    @Lob
    @Convert(converter = SlotValueJsonConverter::class)
    @Column(name = "value_json", nullable = false)
    var value: Map<String, Any?>,

    var draft: Boolean = true,

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false)
    var context: SlotValueContext = SlotValueContext.STUDY,
)
