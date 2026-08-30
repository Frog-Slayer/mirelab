package com.mirelab.domain.post

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
import java.time.Instant
import java.util.UUID
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes

@Entity
@Table(name = "posts")
class Post(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    val author: User,

    var title: String = "",

    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    @Column(name = "body_json", columnDefinition = "text")
    var bodyJson: String? = null,

    @Column(nullable = false, length = 200)
    var excerpt: String = "",

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_id")
    var work: Work? = null,

    @Column(nullable = false)
    var published: Boolean = false,

    @Column(name = "published_at")
    var publishedAt: Instant? = null,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
) {
    fun setPublished(next: Boolean, now: Instant = Instant.now()) {
        published = next
        if (next && publishedAt == null) publishedAt = now
    }
}
