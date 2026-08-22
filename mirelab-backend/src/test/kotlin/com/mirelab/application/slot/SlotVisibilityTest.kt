package com.mirelab.application.slot

import com.mirelab.domain.slot.SlotDef
import com.mirelab.domain.slot.SlotOwner
import com.mirelab.domain.slot.SlotType
import com.mirelab.domain.slot.SlotValue
import com.mirelab.domain.slot.Visibility
import com.mirelab.domain.study.Study
import com.mirelab.domain.study.StudyMember
import com.mirelab.domain.user.Role
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
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.transaction.annotation.Transactional

/**
 * 별점은 스터디가 칸 단위로 정하는 visibility 가 아니라 각자의 공개 토글(published)로
 * 판정한다 — 다 같이 마지막에 여는 게 이 기능의 전부라 개인 토글이 칸 정책보다 앞선다.
 *
 * 다만 그 예외가 "평점은 아무 관문도 안 거친다"가 되면 안 된다. 숨긴 칸은 published 여부와
 * 무관하게 이 화면 소관이 아니다.
 */
@SpringBootTest
@Transactional
class SlotVisibilityTest @Autowired constructor(
    private val slotService: SlotService,
    private val userRepository: UserRepository,
    private val studyRepository: StudyRepository,
    private val studyMemberRepository: StudyMemberRepository,
    private val workRepository: WorkRepository,
    private val slotDefRepository: SlotDefRepository,
    private val slotValueRepository: SlotValueRepository,
) {
    private lateinit var viewer: User
    private lateinit var rater: User
    private lateinit var study: Study
    private lateinit var work: Work

    @BeforeEach
    fun setUp() {
        viewer = saveUser("보는사람")
        rater = saveUser("매긴사람")
        study = studyRepository.save(Study(slug = "rating-study", name = "평점 스터디", hasWorks = true))
        listOf(viewer, rater).forEach { studyMemberRepository.save(StudyMember(study = study, user = it)) }
        work = workRepository.save(
            Work(
                study = study,
                kind = WorkKind.BOOK,
                title = "책",
                author = "지은이",
                year = 2026,
                status = WorkStatus.DONE,
            ),
        )
    }

    @Test
    fun `공개한 평점은 칸이 PRIVATE 이어도 남에게 보인다`() {
        val slot = saveRatingSlot(visibility = Visibility.PRIVATE)
        saveRating(slot, published = true)

        assertNotNull(ratingOfOther(), "개인 공개 토글이 칸 정책보다 앞서야 한다")
    }

    @Test
    fun `비공개 평점은 칸이 ALWAYS 여도 남에게 안 보인다`() {
        val slot = saveRatingSlot(visibility = Visibility.ALWAYS)
        saveRating(slot, published = false)

        assertNull(ratingOfOther(), "아직 안 연 별점은 누구에게도 보이면 안 된다")
    }

    @Test
    fun `숨긴 칸의 평점은 공개했어도 남에게 안 보인다`() {
        val slot = saveRatingSlot(visibility = Visibility.ALWAYS, hidden = true)
        saveRating(slot, published = true)

        assertNull(ratingOfOther(), "숨긴 칸은 published 여부와 무관하게 이 화면 소관이 아니다")
    }

    @Test
    fun `내 평점은 공개 전에도 나에게는 보인다`() {
        val slot = saveRatingSlot(visibility = Visibility.PRIVATE)
        saveRating(slot, published = false)

        val mine = slotService.getWorkSlots(work.id!!, rater.id!!)?.values?.singleOrNull()
        assertEquals(rater.id, mine?.userId)
    }

    @Test
    fun `비공개면 한줄평도 같이 가려진다`() {
        val rating = saveRatingSlot(visibility = Visibility.ALWAYS)
        val blurb = saveBlurbSlot()
        saveRating(rating, published = false)
        saveBlurb(blurb, published = false)

        assertNull(blurbOfOther(), "점수만 감추고 한줄평이 남으면 가린 의미가 없다")
    }

    @Test
    fun `공개 토글은 별점과 한줄평을 함께 연다`() {
        val rating = saveRatingSlot(visibility = Visibility.ALWAYS)
        val blurb = saveBlurbSlot()
        saveRating(rating, published = false)
        saveBlurb(blurb, published = false)

        assertTrue(slotService.setRatingPublished(work.id!!, rater.id!!, true))

        assertNotNull(ratingOfOther(), "별점이 열려야 한다")
        assertNotNull(blurbOfOther(), "한줄평도 같이 열려야 한다")
    }

    @Test
    fun `공개해둔 뒤에 쓴 한줄평도 곧바로 공개된다`() {
        val rating = saveRatingSlot(visibility = Visibility.ALWAYS)
        val blurb = saveBlurbSlot()
        saveRating(rating, published = true)

        slotService.saveValue(
            work.id!!,
            rater.id!!,
            SlotValueInput(slotDefId = blurb.id!!, value = mapOf("text" to "좋았다"), draft = false),
        )

        assertNotNull(blurbOfOther(), "나중에 쓴 한줄평이 혼자 비공개로 남으면 안 된다")
    }

    private fun ratingOfOther() = valueOfOther(SlotType.RATING)

    private fun blurbOfOther() = valueOfOther(SlotType.TEXT_SHORT)

    private fun valueOfOther(type: SlotType): SlotValueResponse? {
        val response = slotService.getWorkSlots(work.id!!, viewer.id!!) ?: return null
        val slotIds = response.slots.filter { it.type == type }.map { it.id }.toSet()
        return response.values.firstOrNull { it.userId == rater.id && it.slotDefId in slotIds }
    }

    private fun saveUser(name: String) = userRepository.save(
        User(
            name = name,
            color = "bg-sky-500",
            email = "${UUID.randomUUID()}@example.com",
            role = Role.MEMBER,
        ),
    )

    private fun saveRatingSlot(visibility: Visibility, hidden: Boolean = false) = slotDefRepository.save(
        SlotDef(
            study = study,
            name = "별점",
            type = SlotType.RATING,
            visibility = visibility,
            owner = SlotOwner.STUDY,
            sortOrder = 0,
            hidden = hidden,
        ),
    )

    private fun saveBlurbSlot() = slotDefRepository.save(
        SlotDef(
            study = study,
            name = "한줄평",
            type = SlotType.TEXT_SHORT,
            visibility = Visibility.ALWAYS,
            owner = SlotOwner.STUDY,
            sortOrder = 1,
        ),
    )

    private fun saveRating(slot: SlotDef, published: Boolean) =
        saveValue(slot, mapOf("n" to 4), published)

    private fun saveBlurb(slot: SlotDef, published: Boolean) =
        saveValue(slot, mapOf("text" to "재미없었다"), published)

    private fun saveValue(slot: SlotDef, value: Map<String, Any?>, published: Boolean) =
        slotValueRepository.save(
            SlotValue(
                work = work,
                slotDef = slot,
                user = rater,
                value = value,
                draft = false,
                published = published,
            ),
        )
}
