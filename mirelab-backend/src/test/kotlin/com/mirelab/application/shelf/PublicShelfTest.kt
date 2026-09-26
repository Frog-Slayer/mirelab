package com.mirelab.application.shelf

import com.mirelab.domain.rating.WorkRating
import com.mirelab.domain.study.Study
import com.mirelab.domain.study.StudyMember
import com.mirelab.domain.user.User
import com.mirelab.domain.work.Work
import com.mirelab.domain.work.WorkKind
import com.mirelab.domain.work.WorkStatus
import com.mirelab.infra.rating.WorkRatingRepository
import com.mirelab.infra.study.StudyMemberRepository
import com.mirelab.infra.study.StudyRepository
import com.mirelab.infra.user.UserRepository
import com.mirelab.infra.work.WorkRepository
import java.time.Instant
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@Transactional
class PublicShelfTest @Autowired constructor(
    private val shelfService: ShelfService,
    private val userRepository: UserRepository,
    private val studyRepository: StudyRepository,
    private val memberRepository: StudyMemberRepository,
    private val workRepository: WorkRepository,
    private val workRatingRepository: WorkRatingRepository,
) {
    @Test
    fun `남의 책장에는 함께 속한 스터디에서 주인이 평가를 공개한 책만 보인다`() {
        val owner = userRepository.save(User(name = "주인", color = "bg-sky-500"))
        val viewer = userRepository.save(User(name = "열람자", color = "bg-rose-500"))
        val shared = studyRepository.save(Study(slug = "shared-shelf", name = "함께", hasWorks = true))
        listOf(owner, viewer).forEach { memberRepository.save(StudyMember(study = shared, user = it)) }

        saveRating(saveWork(shared, "공개한 책"), owner, published = true)
        saveRating(saveWork(shared, "비공개 책"), owner, published = false)

        val shelf = shelfService.list(requireNotNull(owner.id), requireNotNull(viewer.id))

        assertEquals(listOf("공개한 책"), shelf.entries.map { it.work.title })
        assertTrue(assertNotNull(shelf.entries.single().rating).published)
    }

    /** 내 서재에서는 아직 안 연 평가도 내 것이니 그대로 보인다 */
    @Test
    fun `내 책장에는 비공개 평가도 보인다`() {
        val owner = userRepository.save(User(name = "주인", color = "bg-sky-500"))
        val study = studyRepository.save(Study(slug = "my-shelf", name = "내 스터디", hasWorks = true))
        memberRepository.save(StudyMember(study = study, user = owner))
        saveRating(saveWork(study, "비공개 책"), owner, published = false)

        val shelf = shelfService.list(requireNotNull(owner.id))

        assertEquals(listOf("비공개 책"), shelf.entries.map { it.work.title })
        assertEquals(4.0, assertNotNull(shelf.entries.single().rating).score)
    }

    private fun saveWork(study: Study, title: String) = workRepository.save(
        Work(
            study = study,
            kind = WorkKind.BOOK,
            title = title,
            author = "지은이",
            year = 2026,
            status = WorkStatus.DONE,
        ),
    )

    private fun saveRating(work: Work, owner: User, published: Boolean) =
        workRatingRepository.save(
            WorkRating(
                work = work,
                user = owner,
                score = 4.0,
                blurb = "좋았다",
                published = published,
                createdAt = Instant.now(),
                updatedAt = Instant.now(),
            ),
        )
}
