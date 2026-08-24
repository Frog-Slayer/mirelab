package com.mirelab.domain.work

import com.mirelab.domain.study.Study
import com.mirelab.domain.user.User
import jakarta.persistence.CollectionTable
import jakarta.persistence.Column
import jakarta.persistence.ElementCollection
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.OrderColumn
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes

/**
 * 스터디가 다루는 책·영화, 또는 개인이 혼자 담은 책. [study] 와 [owner] 중 하나만 채워진다.
 */
@Entity
@Table(name = "works")
class Work(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    /** 스터디가 다루는 책. 개인이 혼자 담은 책은 없다 */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "study_id")
    var study: Study? = null,

    /** 개인 서재에만 있는 책의 주인 */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    var owner: User? = null,

    // PostgreSQL 네이티브 enum 타입은 값이 늘어날 때마다 마이그레이션이 필요해 번거로우니,
    // varchar 로 저장하도록 강제한다(테스트에서 쓰는 H2도 이 방식이 호환된다).
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false)
    var kind: WorkKind,

    var title: String,

    var author: String,

    // "year" 는 예약어와 겹칠 여지가 있어 컬럼명을 그대로 안 쓴다.
    @Column(name = "published_year")
    var year: Int,

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false)
    var status: WorkStatus,

    /** 이 책을 고른 사람 */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "added_by")
    var addedBy: User? = null,

    /** 왜 골랐는지. 명예의 전당에서 함께 보여준다 */
    @Column(length = 500)
    var reason: String? = null,

    /**
     * 알라딘·TMDB 같은 외부 API 가 제공하는 줄거리. 지금은 자리만 잡아둔다.
     * @Lob 을 쓰면 PostgreSQL에서 (문자열이라도) large object/OID 로 매핑돼버리니
     * LONGVARCHAR 로 지정해 PostgreSQL은 text, H2는 clob 인 평범한 텍스트 컬럼을 쓴다.
     */
    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    var description: String? = null,

    /**
     * 스터디에 속하지 않은 개인 책의 자유 형식 노트(BlockNote 블록 배열 JSON).
     * 개인 책만 사용하고 스터디 작품은 기존 SlotValue·WorkBlock 기록 흐름을 유지한다.
    */
    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    @Column(name = "personal_body_json", columnDefinition = "text")
    var personalBodyJson: String? = null,

    /** 알라딘·TMDB 같은 외부 API 가 제공하는 표지 이미지 URL */
    @Column(name = "cover_url")
    var coverUrl: String? = null,

    /** 영화에서만 — 등장 배우. TMDB 연동 전까지는 비어 있다 */
    @ElementCollection
    @CollectionTable(name = "work_actors", joinColumns = [JoinColumn(name = "work_id")])
    @OrderColumn(name = "position")
    @Column(name = "actor")
    var actors: MutableList<String> = mutableListOf(),

    /**
     * 지금 상태로 들어온 시각들. 작품 목록이 상태별로 다른 날짜를 기준으로 줄을 세우기
     * 때문에 상태마다 하나씩 둔다 — 후보는 담긴 날, 진행 중은 시작한 날, 완료는 끝난 날.
     *
     * 셋 다 DB 에서는 null 을 허용한다. ddl-auto=update 는 이미 행이 있는 테이블에
     * 기본값 없는 NOT NULL 컬럼을 못 붙이고, 이 컬럼들이 생기기 전에 만들어진 작품은
     * 되살릴 근거도 없기 때문이다. 값이 없는 작품은 목록에서 뒤로 민다.
     */
    @Column(name = "added_at")
    var addedAt: Instant? = Instant.now(),

    /** "시작하기"를 눌러 읽기 시작한 시각. 아직 후보면 비어 있다 */
    @Column(name = "started_at")
    var startedAt: Instant? = null,

    /** 완료로 넘어간 시각. 아직 안 끝났으면 비어 있다 */
    @Column(name = "finished_at")
    var finishedAt: Instant? = null,
) {
    /**
     * 상태를 옮기면서 그 상태로 들어온 시각을 함께 남긴다.
     *
     * 되돌리는 경우(완료 -> 진행 중, 진행 중 -> 후보)에는 앞선 시각을 지운다 — 이 값들은
     * "지금 상태가 언제 시작됐나"이지 이력이 아니다. 지우지 않으면 후보로 되돌린 책이
     * 완료 날짜를 그대로 달고 있게 된다.
     */
    fun moveTo(status: WorkStatus, now: Instant = Instant.now()) {
        if (this.status == status) return
        this.status = status
        when (status) {
            WorkStatus.CANDIDATE -> {
                startedAt = null
                finishedAt = null
            }
            WorkStatus.READING -> {
                startedAt = now
                finishedAt = null
            }
            WorkStatus.DONE -> {
                // 시작을 안 거치고 바로 완료로 옮기는 경우가 있다 — 그때도 시작한 적은
                // 있는 셈이라 비워두지 않는다.
                if (startedAt == null) startedAt = now
                finishedAt = now
            }
        }
    }
}
