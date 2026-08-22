package com.mirelab.application.work

import com.mirelab.auth.AuthPrincipal
import com.mirelab.domain.auth.AccessRequest
import com.mirelab.domain.study.Study
import com.mirelab.domain.study.StudyMember
import com.mirelab.domain.user.Role
import com.mirelab.domain.user.User
import com.mirelab.domain.work.Work
import com.mirelab.domain.work.WorkBlock
import com.mirelab.domain.work.WorkKind
import com.mirelab.domain.work.WorkStatus
import com.mirelab.infra.auth.AccessRequestRepository
import com.mirelab.infra.study.StudyMemberRepository
import com.mirelab.infra.study.StudyRepository
import com.mirelab.infra.user.UserRepository
import com.mirelab.infra.work.WorkBlockRepository
import com.mirelab.infra.work.WorkRepository
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import org.junit.jupiter.api.BeforeEach
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.transaction.annotation.Transactional

/**
 * 실시간 편집의 인가는 "발급 → 소비 → 접속 중 재확인" 세 지점에서 모두 같은 판정이어야 한다.
 * 특히 거부된 계정은 스터디 멤버십이 남아 있어도(거부가 멤버십을 지우지는 않는다) 어느
 * 지점에서도 통과하면 안 된다.
 */
@SpringBootTest
@Transactional
class WorkBlockAccessControllerTest @Autowired constructor(
    private val controller: WorkBlockAccessController,
    private val userRepository: UserRepository,
    private val studyRepository: StudyRepository,
    private val studyMemberRepository: StudyMemberRepository,
    private val workRepository: WorkRepository,
    private val workBlockRepository: WorkBlockRepository,
    private val accessRequestRepository: AccessRequestRepository,
) {
    private lateinit var member: User
    private lateinit var membership: StudyMember
    private lateinit var request: AccessRequest
    private lateinit var blockId: UUID

    @BeforeEach
    fun setUp() {
        member = userRepository.save(
            User(name = "멤버", color = "bg-sky-500", email = "member@example.com", role = Role.MEMBER),
        )
        request = accessRequestRepository.save(
            AccessRequest(email = "member@example.com", googleName = "멤버"),
        ).also { it.approve(member) }

        val study = studyRepository.save(Study(slug = "test-study", name = "테스트 스터디", hasWorks = true))
        membership = studyMemberRepository.save(StudyMember(study = study, user = member))
        val work = workRepository.save(
            Work(
                study = study,
                kind = WorkKind.BOOK,
                title = "책",
                author = "지은이",
                year = 2026,
                status = WorkStatus.READING,
            ),
        )
        blockId = requireNotNull(
            workBlockRepository.save(
                WorkBlock(work = work, author = member, title = "기록", createdAt = Instant.now()),
            ).id,
        )
    }

    private fun principal() = AuthPrincipal(userId = requireNotNull(member.id), name = member.name, role = member.role)

    @Test
    fun `승인된 멤버는 티켓을 받고 그 티켓으로 접속을 인가받는다`() {
        val issued = controller.issue(blockId, principal())
        val ticket = assertNotNull(issued.body).value

        val consumed = controller.consume(blockId, ticket)
        assertEquals(200, consumed.statusCode.value())
        assertEquals(member.id, assertNotNull(consumed.body).userId)

        assertEquals(204, controller.stillAllowed(blockId, requireNotNull(member.id)).statusCode.value())
    }

    @Test
    fun `거부된 계정은 멤버십이 남아 있어도 티켓을 받지 못한다`() {
        request.reject()

        assertEquals(403, controller.issue(blockId, principal()).statusCode.value())
        assertEquals(403, controller.stillAllowed(blockId, requireNotNull(member.id)).statusCode.value())
    }

    @Test
    fun `티켓을 받은 뒤 거부되면 그 티켓으로도 접속하지 못한다`() {
        val ticket = assertNotNull(controller.issue(blockId, principal()).body).value

        request.reject()

        assertEquals(403, controller.consume(blockId, ticket).statusCode.value())
    }

    @Test
    fun `접속 중 스터디에서 빠지면 재확인이 거절된다`() {
        assertEquals(204, controller.stillAllowed(blockId, requireNotNull(member.id)).statusCode.value())

        studyMemberRepository.delete(membership)
        studyMemberRepository.flush()

        assertEquals(403, controller.stillAllowed(blockId, requireNotNull(member.id)).statusCode.value())
    }
}
