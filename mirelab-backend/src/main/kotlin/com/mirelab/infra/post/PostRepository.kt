package com.mirelab.infra.post

import com.mirelab.domain.post.Post
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface PostRepository : JpaRepository<Post, UUID> {
    fun findByAuthorIdOrderByUpdatedAtDesc(authorId: UUID): List<Post>

    fun findByWorkIdOrderByPublishedAtDesc(workId: UUID): List<Post>

    fun findFirstByWorkIdAndAuthorIdOrderByCreatedAtDesc(workId: UUID, authorId: UUID): Post?
}
