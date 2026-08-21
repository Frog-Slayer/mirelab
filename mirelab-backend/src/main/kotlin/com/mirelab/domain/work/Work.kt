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
import jakarta.persistence.Lob
import jakarta.persistence.ManyToOne
import jakarta.persistence.OrderColumn
import jakarta.persistence.Table
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

    // H2 가 네이티브 enum DDL 문법을 못 읽어서, varchar 로 저장하도록 강제한다.
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false)
    var kind: WorkKind,

    var title: String,

    var author: String,

    // "year" 도 H2 예약어라 컬럼명을 그대로 못 쓴다.
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

    /** 알라딘·TMDB 같은 외부 API 가 제공하는 줄거리. 지금은 자리만 잡아둔다 */
    @Lob
    var description: String? = null,

    /** 알라딘·TMDB 같은 외부 API 가 제공하는 표지 이미지 URL */
    @Column(name = "cover_url")
    var coverUrl: String? = null,

    /** 영화에서만 — 등장 배우. TMDB 연동 전까지는 비어 있다 */
    @ElementCollection
    @CollectionTable(name = "work_actors", joinColumns = [JoinColumn(name = "work_id")])
    @OrderColumn(name = "position")
    @Column(name = "actor")
    var actors: MutableList<String> = mutableListOf(),
)
