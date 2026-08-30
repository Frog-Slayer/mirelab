package com.mirelab.application.rating

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
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.transaction.annotation.Transactional

/**
 * 평가는 각자의 공개 토글(published)이 전부다 — 다 같이 마지막에 "하나, 둘, 셋" 하고 여는
 * 게 이 기능의 요점이라, 열기 전에는 남에게 점수도 한줄평도 새면 안 된다.
 *
 * 별점과 한줄평이 한 행이므로 토글 하나가 둘 다를 여닫는다. 예전에는 둘이 따로 있어서
 * "한줄평을 저장할 때 별점 쪽 공개 상태를 물려받게" 맞춰줘야 했고, 그 짝짓기가 어긋나면
 * 점수만 가려진 채 "재미없었다"가 그대로 보였다.
 */
@SpringBootTest
@Transactional
class RatingVisibilityTest @Autowired constructor(
    private val ratingService: RatingService,
    private val userRepository: UserRepository,
    private val studyRepository: StudyRepository,
    private val studyMemberRepository: StudyMemberRepository,
    private val workRepository: WorkRepository,
    private val workRatingRepository: WorkRatingRepository,
) {
    private lateinit var viewer: User
    private lateinit var rater: User
    private lateinit var work: Work

    @BeforeEach
    fun setUp() {
        viewer = userRepository.save(User(name = "보는사람", color = "bg-sky-500"))
        rater = userRepository.save(User(name = "매긴사람", color = "bg-rose-500"))
        val study = studyRepository.save(Study(slug = "rating-study", name = "평점 스터디", hasWorks = true))
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

    private val workId: UUID get() = requireNotNull(work.id)
    private val raterId: UUID get() = requireNotNull(rater.id)
    private val viewerId: UUID get() = requireNotNull(viewer.id)

    @Test
    fun `공개 전에는 남에게 점수도 한줄평도 안 보인다`() {
        ratingService.save(workId, raterId, SaveRatingRequest(score = 4.5, blurb = "재미없었다"))

        assertEquals(emptyList(), ratingService.listVisible(workId, viewerId))

        // 매긴 본인에게는 늘 보인다
        val mine = assertNotNull(ratingService.listVisible(workId, raterId).singleOrNull())
        assertEquals(4.5, mine.score)
        assertEquals("재미없었다", mine.blurb)
        assertFalse(mine.published)
    }

    @Test
    fun `공개하면 별점과 한줄평이 함께 열린다`() {
        ratingService.save(workId, raterId, SaveRatingRequest(score = 4.5, blurb = "좋았다"))
        assertTrue(ratingService.setPublished(workId, raterId, true))

        val seen = assertNotNull(ratingService.listVisible(workId, viewerId).singleOrNull())
        assertEquals(4.5, seen.score)
        assertEquals("좋았다", seen.blurb)
    }

    /** 공개해 둔 뒤 한줄평만 고쳤다고 도로 닫히면 안 된다 — 여닫는 일은 토글 하나뿐이다 */
    @Test
    fun `공개한 뒤 고쳐도 공개 상태는 그대로다`() {
        ratingService.save(workId, raterId, SaveRatingRequest(score = 4.0))
        ratingService.setPublished(workId, raterId, true)

        ratingService.save(workId, raterId, SaveRatingRequest(blurb = "다시 읽으니 다르다"))

        val seen = assertNotNull(ratingService.listVisible(workId, viewerId).singleOrNull())
        assertTrue(seen.published)
        assertEquals("다시 읽으니 다르다", seen.blurb)
        assertEquals(4.0, seen.score)
    }

    /** 점수 없는 한줄평만 열리면 화면이 별점 자리를 빈 채로 그리게 된다 */
    @Test
    fun `별점을 매기기 전에는 공개할 수 없다`() {
        ratingService.save(workId, raterId, SaveRatingRequest(blurb = "아직 읽는 중"))

        assertFalse(ratingService.setPublished(workId, raterId, true))
        assertEquals(emptyList(), ratingService.listVisible(workId, viewerId))
    }

    @Test
    fun `아무 평가도 없으면 공개할 것이 없다`() {
        assertFalse(ratingService.setPublished(workId, raterId, true))
    }

    @Test
    fun `한 사람은 한 작품에 평가를 하나만 갖는다`() {
        ratingService.save(workId, raterId, SaveRatingRequest(score = 3.0))
        ratingService.save(workId, raterId, SaveRatingRequest(score = 5.0))

        assertEquals(1, workRatingRepository.findByWorkId(workId).size)
        assertEquals(5.0, assertNotNull(workRatingRepository.findByWorkIdAndUserId(workId, raterId)).score)
    }

    @Test
    fun `빈 문자열을 보내면 한줄평이 지워진다`() {
        ratingService.save(workId, raterId, SaveRatingRequest(score = 3.0, blurb = "그저 그랬다"))
        ratingService.save(workId, raterId, SaveRatingRequest(blurb = "  "))

        assertNull(assertNotNull(workRatingRepository.findByWorkIdAndUserId(workId, raterId)).blurb)
    }
}
