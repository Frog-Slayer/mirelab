package com.mirelab.application.note

import com.mirelab.auth.AuthPrincipal
import com.mirelab.domain.note.NoteKind
import com.mirelab.domain.study.Study
import com.mirelab.domain.study.StudyMember
import com.mirelab.domain.user.Role
import com.mirelab.domain.user.User
import com.mirelab.domain.work.Work
import com.mirelab.domain.work.WorkKind
import com.mirelab.domain.work.WorkStatus
import com.mirelab.infra.study.StudyMemberRepository
import com.mirelab.infra.study.StudyRepository
import com.mirelab.infra.user.UserRepository
import com.mirelab.infra.work.WorkRepository
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.assertThrows
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.HttpStatus
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException

/**
 * 메모는 같은 스터디 멤버에게도 안 보이는 유일한 기록이다 — 스터디 관문을 통과하는 것과
 * "내 메모인가"는 별개의 판정이어야 한다.
 */
@SpringBootTest
@Transactional
class WorkNoteAccessTest @Autowired constructor(
    private val controller: WorkNoteController,
    private val userRepository: UserRepository,
    private val studyRepository: StudyRepository,
    private val studyMemberRepository: StudyMemberRepository,
    private val workRepository: WorkRepository,
) {
    private lateinit var me: User
    private lateinit var teammate: User
    private lateinit var outsider: User
    private lateinit var workId: UUID

    @BeforeEach
    fun setUp() {
        me = userRepository.save(
            User(name = "나", color = "bg-sky-500", email = "me@example.com", role = Role.MEMBER),
        )
        teammate = userRepository.save(
            User(name = "같은 스터디 사람", color = "bg-rose-500", email = "mate@example.com", role = Role.MEMBER),
        )
        outsider = userRepository.save(
            User(name = "남", color = "bg-lime-500", email = "outsider@example.com", role = Role.MEMBER),
        )

        val study = studyRepository.save(Study(slug = "note-study", name = "메모 스터디", hasWorks = true))
        studyMemberRepository.save(StudyMember(study = study, user = me))
        studyMemberRepository.save(StudyMember(study = study, user = teammate))
        workId = requireNotNull(
            workRepository.save(
                Work(
                    study = study,
                    kind = WorkKind.BOOK,
                    title = "책",
                    author = "지은이",
                    year = 2026,
                    status = WorkStatus.READING,
                ),
            ).id,
        )
    }

    private fun principal(user: User) =
        AuthPrincipal(userId = requireNotNull(user.id), name = user.name, role = user.role)

    private fun createNote(user: User, kind: NoteKind = NoteKind.MEMO): UUID =
        assertNotNull(controller.create(workId, principal(user), CreateWorkNoteRequest(kind)).body).id

    @Test
    fun `한 사람이 한 작품에 같은 종류의 메모를 여러 장 만든다`() {
        repeat(3) { createNote(me, NoteKind.QUESTION) }

        val mine = controller.list(workId, principal(me))
        assertEquals(3, mine.size)
        assertTrue(mine.all { it.kind == NoteKind.QUESTION })
    }

    @Test
    fun `같은 스터디 멤버에게도 내 메모는 안 보인다`() {
        createNote(me)

        assertEquals(emptyList(), controller.list(workId, principal(teammate)))
    }

    @Test
    fun `남의 메모는 고치지도 지우지도 못한다 - 있다는 것조차 알리지 않는다`() {
        val noteId = createNote(me)

        val edit = assertThrows<ResponseStatusException> {
            controller.update(noteId, principal(teammate), UpdateWorkNoteRequest(body = "덮어쓰기"))
        }
        assertEquals(HttpStatus.NOT_FOUND, edit.statusCode)

        val delete = assertThrows<ResponseStatusException> {
            controller.remove(noteId, principal(teammate))
        }
        assertEquals(HttpStatus.NOT_FOUND, delete.statusCode)

        assertEquals("", assertNotNull(controller.list(workId, principal(me)).firstOrNull()).body)
    }

    @Test
    fun `스터디 밖 사람은 메모 목록에 닿지 못한다`() {
        val listed = assertThrows<ResponseStatusException> { controller.list(workId, principal(outsider)) }
        assertEquals(HttpStatus.FORBIDDEN, listed.statusCode)

        val created = assertThrows<ResponseStatusException> {
            controller.create(workId, principal(outsider), CreateWorkNoteRequest(NoteKind.MEMO))
        }
        assertEquals(HttpStatus.FORBIDDEN, created.statusCode)
    }

    @Test
    fun `종류와 본문은 따로 고칠 수 있다`() {
        val noteId = createNote(me)

        controller.update(noteId, principal(me), UpdateWorkNoteRequest(body = "옮겨 적은 문장"))
        controller.update(noteId, principal(me), UpdateWorkNoteRequest(kind = NoteKind.QUOTE))

        val note = assertNotNull(controller.list(workId, principal(me)).firstOrNull())
        assertEquals(NoteKind.QUOTE, note.kind)
        assertEquals("옮겨 적은 문장", note.body)
    }
}
