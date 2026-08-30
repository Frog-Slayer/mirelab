package com.mirelab.application.shelf

import com.mirelab.domain.slot.SlotDef
import com.mirelab.domain.slot.SlotOwner
import com.mirelab.domain.slot.SlotType
import com.mirelab.domain.slot.SlotValue
import com.mirelab.domain.slot.Visibility
import com.mirelab.domain.study.Study
import com.mirelab.domain.study.StudyMember
import com.mirelab.domain.user.User
import com.mirelab.domain.work.Work
import com.mirelab.domain.work.WorkKind
import com.mirelab.domain.work.WorkStatus
import com.mirelab.infra.slot.SlotDefRepository
import com.mirelab.infra.slot.SlotValueRepository
import com.mirelab.infra.study.StudyMemberRepository
import com.mirelab.infra.study.StudyRepository
import com.mirelab.infra.user.UserRepository
import com.mirelab.infra.work.WorkRepository
import kotlin.test.Test
import kotlin.test.assertEquals
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
    private val slotDefRepository: SlotDefRepository,
    private val slotValueRepository: SlotValueRepository,
) {
    @Test
    fun `남의 책장에는 함께 속한 스터디에서 주인이 평가를 공개한 책만 보인다`() {
        val owner = userRepository.save(User(name = "주인", color = "bg-sky-500"))
        val viewer = userRepository.save(User(name = "열람자", color = "bg-rose-500"))
        val shared = studyRepository.save(Study(slug = "shared-shelf", name = "함께", hasWorks = true))
        listOf(owner, viewer).forEach { memberRepository.save(StudyMember(study = shared, user = it)) }
        val rating = slotDefRepository.save(
            SlotDef(
                study = shared,
                name = "평점",
                type = SlotType.RATING,
                visibility = Visibility.PRIVATE,
                owner = SlotOwner.STUDY,
                sortOrder = 0,
            ),
        )
        val published = saveWork(shared, "공개한 책")
        val private = saveWork(shared, "비공개 책")
        saveRating(published, rating, owner, true)
        saveRating(private, rating, owner, false)

        val shelf = shelfService.list(requireNotNull(owner.id), requireNotNull(viewer.id))

        assertEquals(listOf("공개한 책"), shelf.entries.map { it.work.title })
        assertTrue(shelf.entries.single().values.single().published)
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

    private fun saveRating(work: Work, slot: SlotDef, owner: User, published: Boolean) =
        slotValueRepository.save(
            SlotValue(
                work = work,
                slotDef = slot,
                user = owner,
                value = mapOf("n" to 4),
                draft = false,
                published = published,
            ),
        )
}
