package com.mirelab.application.post

import com.mirelab.domain.post.Post
import com.mirelab.domain.post.PostShare
import com.mirelab.domain.study.Study
import com.mirelab.domain.study.StudyMember
import com.mirelab.domain.user.User
import com.mirelab.infra.post.PostRepository
import com.mirelab.infra.post.PostShareRepository
import com.mirelab.infra.study.StudyMemberRepository
import com.mirelab.infra.study.StudyRepository
import com.mirelab.infra.user.UserRepository
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@Transactional
class PostAccessTest @Autowired constructor(
    private val accessChecker: PostAccessChecker,
    private val postRepository: PostRepository,
    private val postShareRepository: PostShareRepository,
    private val userRepository: UserRepository,
    private val studyRepository: StudyRepository,
    private val memberRepository: StudyMemberRepository,
) {
    @Test
    fun `초안은 공유 스터디 멤버에게도 보이지 않는다`() {
        val fixture = fixture(published = false)

        assertFalse(accessChecker.canAccess(fixture.post, fixture.viewer.id!!, setOf(fixture.study.id!!)))
    }

    @Test
    fun `공개 글은 공유 스터디 멤버에게 보인다`() {
        val fixture = fixture(published = true)

        assertTrue(accessChecker.canAccess(fixture.post, fixture.viewer.id!!, setOf(fixture.study.id!!)))
    }

    @Test
    fun `공개했어도 공유하지 않은 스터디 멤버에게는 보이지 않는다`() {
        val fixture = fixture(published = true)

        assertFalse(accessChecker.canAccess(fixture.post, fixture.viewer.id!!, emptySet()))
    }

    private fun fixture(published: Boolean): Fixture {
        val author = userRepository.save(User(name = "작성자", color = "bg-sky-500"))
        val viewer = userRepository.save(User(name = "열람자", color = "bg-rose-500"))
        val study = studyRepository.save(Study(slug = "post-access-${System.nanoTime()}", name = "공유", hasWorks = true))
        listOf(author, viewer).forEach { memberRepository.save(StudyMember(study = study, user = it)) }
        val post = postRepository.save(Post(author = author, title = "글", published = published))
        postShareRepository.save(PostShare(post = post, study = study))
        return Fixture(post, viewer, study)
    }

    private data class Fixture(val post: Post, val viewer: User, val study: Study)
}
