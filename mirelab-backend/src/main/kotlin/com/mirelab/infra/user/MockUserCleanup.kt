package com.mirelab.infra.user

import java.util.UUID
import org.slf4j.LoggerFactory
import org.springframework.boot.CommandLineRunner
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional

/** 이전 DevDataSeeder가 만든 이메일 없는 목 사용자와 그 사용자 소유 기록을 정리한다. */
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
@Component
class MockUserCleanup(
    private val jdbcTemplate: JdbcTemplate,
) : CommandLineRunner {
    private val logger = LoggerFactory.getLogger(this::class.java)

    @Transactional
    override fun run(vararg args: String) {
        val ids = MOCK_USER_IDS.toTypedArray()
        val eligibleUserSubquery =
            "select id from users where id in (?, ?, ?) and email is null"

        jdbcTemplate.update(
            "update works set added_by = null where added_by in ($eligibleUserSubquery)",
            *ids,
        )
        jdbcTemplate.update(
            "update works set owner_id = null where owner_id in ($eligibleUserSubquery)",
            *ids,
        )
        jdbcTemplate.update(
            "update access_requests set granted_user_id = null where granted_user_id in ($eligibleUserSubquery)",
            *ids,
        )
        jdbcTemplate.update(
            "delete from refresh_tokens where user_id in ($eligibleUserSubquery)",
            *ids,
        )
        jdbcTemplate.update(
            "delete from work_blocks where author_id in ($eligibleUserSubquery)",
            *ids,
        )
        jdbcTemplate.update(
            "delete from work_notes where author_id in ($eligibleUserSubquery)",
            *ids,
        )
        jdbcTemplate.update(
            "delete from work_ratings where user_id in ($eligibleUserSubquery)",
            *ids,
        )
        jdbcTemplate.update(
            "delete from study_members where user_id in ($eligibleUserSubquery)",
            *ids,
        )
        val removed = jdbcTemplate.update(
            "delete from users where id in (?, ?, ?) and email is null",
            *ids,
        )

        if (removed > 0) {
            logger.info("이전 개발 시드의 목 사용자 {}명을 제거했습니다", removed)
        }
    }

    private companion object {
        val MOCK_USER_IDS = listOf(
            UUID.fromString("22222222-2222-2222-2222-222222222222"),
            UUID.fromString("33333333-3333-3333-3333-333333333333"),
            UUID.fromString("44444444-4444-4444-4444-444444444444"),
        )
    }
}
