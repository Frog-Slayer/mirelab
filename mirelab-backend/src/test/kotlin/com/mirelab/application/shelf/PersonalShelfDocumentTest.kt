package com.mirelab.application.shelf

import com.mirelab.domain.user.User
import com.mirelab.domain.work.Work
import com.mirelab.domain.work.WorkKind
import com.mirelab.domain.work.WorkStatus
import com.mirelab.infra.user.UserRepository
import com.mirelab.infra.work.WorkRepository
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException

@SpringBootTest
@Transactional
class PersonalShelfDocumentTest @Autowired constructor(
    private val shelfService: ShelfService,
    private val userRepository: UserRepository,
    private val workRepository: WorkRepository,
) {
    @Test
    fun `개인 책 주인은 자유 형식 문서를 저장할 수 있다`() {
        val owner = userRepository.save(User(name = "주인", color = "bg-sky-500"))
        val work = savePersonalWork(owner)
        val bodyJson = """[{"type":"paragraph","content":"메모"}]"""

        shelfService.saveDocument(owner.id!!, work.id!!, ShelfDocumentInput(bodyJson))

        assertEquals(bodyJson, workRepository.findById(work.id!!).get().personalBodyJson)
    }

    @Test
    fun `남의 개인 책 문서는 저장할 수 없다`() {
        val owner = userRepository.save(User(name = "주인", color = "bg-sky-500"))
        val viewer = userRepository.save(User(name = "다른 사람", color = "bg-rose-500"))
        val work = savePersonalWork(owner)

        assertFailsWith<ResponseStatusException> {
            shelfService.saveDocument(viewer.id!!, work.id!!, ShelfDocumentInput("[]"))
        }
    }

    @Test
    fun `개인 책은 후보 상태로 서재에 들어간다`() {
        val owner = userRepository.save(User(name = "주인", color = "bg-sky-500"))

        val work = shelfService.addPersonalWork(
            owner.id!!,
            AddPersonalWorkRequest(kind = WorkKind.BOOK, title = "후보 책", author = "지은이"),
        )!!

        assertEquals(WorkStatus.CANDIDATE, work.status)
        assertNull(work.startedAt)
        val workId = work.id

        shelfService.setStatus(owner.id!!, workId, WorkStatus.READING)

        val started = workRepository.findById(workId).get()
        assertEquals(WorkStatus.READING, started.status)
        kotlin.test.assertNotNull(started.startedAt)
    }

    private fun savePersonalWork(owner: User) = workRepository.save(
        Work(
            owner = owner,
            kind = WorkKind.BOOK,
            title = "개인 책",
            author = "지은이",
            year = 2026,
            status = WorkStatus.READING,
        ),
    )
}
