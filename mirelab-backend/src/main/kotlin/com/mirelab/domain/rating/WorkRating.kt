package com.mirelab.domain.rating

import com.mirelab.domain.user.User
import com.mirelab.domain.work.Work
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.Instant
import java.util.UUID

/**
 * 한 사람이 한 작품에 남기는 평가 — 별점과 한줄평.
 *
 * 둘을 한 행에 담는 이유: 여닫는 단위가 낱개가 아니라 덩어리다. 별점만 가리고 한줄평이
 * 남으면 "재미없었다" 가 그대로 보이는 채로 점수만 감춘 꼴이라 가린 의미가 없다. 예전에는
 * 둘이 범용 칸(slot_values)에 따로 들어 있었고, "어느 칸이 한줄평인가" 를 *그 스터디의 첫
 * 번째 non-PRIVATE TEXT_SHORT 칸* 이라는 규칙으로 정했다 — 그 규칙이 서버·화면 다섯 군데에
 * 복제돼 있어서 한쪽만 바뀌면 조용히 어긋났다. 한 행으로 합치면 그 규칙 자체가 없어진다.
 *
 * 평가는 **스터디에 남는 기록**이다. 나만 보는 메모는 [com.mirelab.domain.note.WorkNote] 로
 * 따로 쌓인다.
 */
@Entity
@Table(
    name = "work_ratings",
    uniqueConstraints = [UniqueConstraint(columnNames = ["work_id", "user_id"])],
)
class WorkRating(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "work_id", nullable = false)
    var work: Work,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    var user: User,

    /**
     * 0.1 단위의 5점 만점(화면의 별 다섯 개가 그렇게 움직인다). 아직 안 매겼으면 null —
     * 한줄평만 먼저 써 두는 경우가 있어서 0.0 과 "안 매김" 을 구분해야 한다.
     */
    var score: Double? = null,

    /**
     * "한 줄로" 라고 안내하지만 화면이 길이를 막지는 않는다 — 기본값(255자)으로 두면
     * 길게 쓴 사람의 저장이 500 으로 터진다. 여유를 둔다.
     */
    @Column(length = 1_000)
    var blurb: String? = null,

    /**
     * 공개 여부. 새 평가는 본인에게만 보이고, 다 같이 여는 순간에 열린다.
     * 별점과 한줄평이 한 행이므로 이 값 하나가 둘 다를 여닫는다.
     */
    @Column(nullable = false)
    var published: Boolean = false,

    val createdAt: Instant,

    var updatedAt: Instant,
)
