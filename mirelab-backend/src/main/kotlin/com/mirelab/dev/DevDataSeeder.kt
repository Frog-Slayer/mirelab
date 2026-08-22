package com.mirelab.dev

import java.util.UUID
import org.springframework.boot.CommandLineRunner
import org.springframework.context.annotation.Profile
import org.springframework.core.annotation.Order
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional

/**
 * 로컬 개발에 필요한 구조 데이터만 보장한다.
 *
 * 사용자·책·평점 같은 도메인 데이터는 실제 가입과 화면 입력으로만 생성한다. 예전처럼
 * 이름뿐인 목 사용자를 넣으면 스터디 멤버와 멤버별 평점에 실제 계정과 함께 노출되기 때문이다.
 */
@Order(DEV_SEEDER_ORDER)
@Profile("dev")
@Component
class DevDataSeeder(
    private val jdbcTemplate: JdbcTemplate,
) : CommandLineRunner {

    @Transactional
    override fun run(vararg args: String) {
        val studyId = ensureReadingStudy()
        ensureSlotDefs(studyId)
    }

    private fun ensureReadingStudy(): UUID {
        val existing = jdbcTemplate.query(
            "select id from studies where slug = ?",
            { rs, _ -> rs.getObject("id", UUID::class.java) },
            READING_SLUG,
        ).firstOrNull()
        if (existing != null) return existing

        jdbcTemplate.update(
            "insert into studies (id, slug, name, has_works) values (?, ?, ?, ?)",
            READING_STUDY_ID, READING_SLUG, "독서 스터디", true,
        )
        return READING_STUDY_ID
    }

    private fun ensureSlotDefs(studyId: UUID) {
        val count = jdbcTemplate.queryForObject(
            "select count(*) from slot_defs where study_id = ?",
            Int::class.java,
            studyId,
        ) ?: 0
        if (count > 0) return

        SLOT_DEFS.forEach { slot ->
            jdbcTemplate.update(
                """insert into slot_defs
                   (id, study_id, name, type, visibility, owner, sort_order, hidden)
                   values (?, ?, ?, ?, 'ALWAYS', 'STUDY', ?, ?)""",
                slot.id, studyId, slot.name, slot.type, slot.sortOrder, slot.hidden,
            )
        }
    }

    private data class SlotDefSeed(
        val id: UUID,
        val name: String,
        val type: String,
        val sortOrder: Int,
        val hidden: Boolean = false,
    )

    private companion object {
        val READING_STUDY_ID: UUID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
        const val READING_SLUG = "reading"

        val SLOT_DEFS = listOf(
            SlotDefSeed(UUID.fromString("c45bf0b4-6906-4b76-bf45-3ac62b165180"), "평점", "RATING", 1),
            SlotDefSeed(UUID.fromString("c9090e36-abd3-4c44-808c-cab9258e45b2"), "한줄평", "TEXT_SHORT", 2),
            SlotDefSeed(UUID.fromString("99f9c4da-411d-42b2-b78e-f9422d077451"), "인상깊은 장면", "LIST", 3),
            SlotDefSeed(UUID.fromString("2e48060c-21fc-4a87-8ad4-12ea6f6a4412"), "발제문", "TEXT_LONG", 7, true),
            SlotDefSeed(UUID.fromString("a2c88e5e-35f5-4a63-acdd-89f4a52d711e"), "내 요약", "TEXT_LONG", 1),
            SlotDefSeed(UUID.fromString("d94fc75f-2507-4a88-832f-0f5838076a6b"), "질문 · 토론거리", "LIST", 2),
            SlotDefSeed(UUID.fromString("9dde3961-5177-4e90-b5de-05ca05907d5c"), "인상깊은 구절", "LIST", 5),
            SlotDefSeed(UUID.fromString("4ceb7968-a937-4a6a-9d96-abf561f3943f"), "아쉬웠던 점", "LIST", 4),
        )
    }
}

/** AdminBootstrap(=[ADMIN_BOOTSTRAP_ORDER]) 보다 앞 */
const val DEV_SEEDER_ORDER = 1
