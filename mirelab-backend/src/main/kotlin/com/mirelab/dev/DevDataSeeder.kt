package com.mirelab.dev

import com.mirelab.domain.study.READING_STUDY_SLUG
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
            READING_STUDY_SLUG,
        ).firstOrNull()
        if (existing != null) return existing

        jdbcTemplate.update(
            "insert into studies (id, slug, name, has_works) values (?, ?, ?, ?)",
            READING_STUDY_ID, READING_STUDY_SLUG, "독서 스터디", true,
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
        /**
         * 평점·한줄평만 남긴다. 나머지 개인 칸(내 요약·질문·인상깊은 구절 등)은 이제
         * 칸이 아니라 [com.mirelab.domain.note.WorkNote] 로 각자 쌓는 메모라, 스터디가
         * 미리 정해 줄 것이 없다.
         */
        val SLOT_DEFS = listOf(
            SlotDefSeed(UUID.fromString("c45bf0b4-6906-4b76-bf45-3ac62b165180"), "평점", "RATING", 1),
            SlotDefSeed(UUID.fromString("c9090e36-abd3-4c44-808c-cab9258e45b2"), "한줄평", "TEXT_SHORT", 2),
        )
    }
}

/** AdminBootstrap(=[ADMIN_BOOTSTRAP_ORDER]) 보다 앞 */
const val DEV_SEEDER_ORDER = 1
