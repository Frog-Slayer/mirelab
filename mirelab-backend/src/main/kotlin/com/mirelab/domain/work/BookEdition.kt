package com.mirelab.domain.work

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.Lob
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.util.UUID

/**
 * 알라딘 검색에서 실제로 고른 특정 판본 — 도서 전용. 같은 ISBN을 고른 다른 Work 들이
 * 공유한다. [workIdentity] 로 어떤 창작물의 판본인지 묶인다.
 */
@Entity
@Table(name = "book_editions")
class BookEdition(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_identity_id", nullable = false)
    var workIdentity: WorkIdentity,

    @Column(unique = true, nullable = false)
    var isbn13: String,

    var title: String,

    var author: String,

    var publisher: String? = null,

    @Column(name = "pub_date")
    var pubDate: String? = null,

    @Column(name = "cover_url")
    var coverUrl: String? = null,

    @Lob
    var description: String? = null,
)
