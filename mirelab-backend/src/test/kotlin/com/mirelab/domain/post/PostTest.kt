package com.mirelab.domain.post

import com.mirelab.domain.user.User
import java.time.Instant
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class PostTest {
    private val author = User(name = "작성자", color = "bg-sky-500")

    @Test
    fun `처음 공개할 때만 발행 시각을 기록하고 비공개로 돌려도 유지한다`() {
        val post = Post(author = author)
        val first = Instant.parse("2026-01-01T00:00:00Z")
        val later = Instant.parse("2026-02-01T00:00:00Z")

        post.setPublished(true, first)
        post.setPublished(false, later)
        post.setPublished(true, later)

        assertTrue(post.published)
        assertEquals(first, post.publishedAt)
    }

    @Test
    fun `비공개로만 저장한 글에는 발행 시각이 생기지 않는다`() {
        val post = Post(author = author)

        post.setPublished(false, Instant.parse("2026-01-01T00:00:00Z"))

        assertFalse(post.published)
        assertEquals(null, post.publishedAt)
    }
}
