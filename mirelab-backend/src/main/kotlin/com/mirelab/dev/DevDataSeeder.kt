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
 * 로컬 개발에 필요한 구조 데이터만 보장한다 — 지금은 스터디 하나뿐이다.
 *
 * 사용자·책·평점 같은 도메인 데이터는 실제 가입과 화면 입력으로만 생성한다. 예전처럼
 * 이름뿐인 목 사용자를 넣으면 스터디 멤버와 멤버별 평점에 실제 계정과 함께 노출되기 때문이다.
 *
 * 예전에는 여기서 기록 칸(slot_defs)까지 심었다. 무엇을 기록하는지가 스터디마다 미리 정해진
 * 목록이었기 때문인데, 지금은 평가([com.mirelab.domain.rating.WorkRating])와 개인 메모
 * ([com.mirelab.domain.note.WorkNote])가 각자 제 테이블을 갖고 있어 미리 심어 둘 것이 없다.
 */
@Order(DEV_SEEDER_ORDER)
@Profile("dev")
@Component
class DevDataSeeder(
    private val jdbcTemplate: JdbcTemplate,
) : CommandLineRunner {

    @Transactional
    override fun run(vararg args: String) {
        ensureReadingStudy()
    }

    private fun ensureReadingStudy() {
        val exists = jdbcTemplate.query(
            "select id from studies where slug = ?",
            { rs, _ -> rs.getObject("id", UUID::class.java) },
            READING_STUDY_SLUG,
        ).isNotEmpty()
        if (exists) return

        jdbcTemplate.update(
            "insert into studies (id, slug, name, has_works) values (?, ?, ?, ?)",
            READING_STUDY_ID, READING_STUDY_SLUG, "독서 스터디", true,
        )
    }

    private companion object {
        val READING_STUDY_ID: UUID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    }
}

/** AdminBootstrap(=[ADMIN_BOOTSTRAP_ORDER]) 보다 앞 */
const val DEV_SEEDER_ORDER = 1
