package com.mirelab.infra.auth

import org.slf4j.LoggerFactory
import org.springframework.boot.CommandLineRunner
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Component

/**
 * `ddl-auto=update`가 예전 AccessRequestStatus enum CHECK 제약을 갱신하지 않는 문제를 정리한다.
 * 기존 DB에 PENDING/APPROVED/REJECTED만 허용하는 제약이 남아 있으면 PROFILE_REQUIRED 저장이
 * 500으로 실패하므로 한 번 제거한다. 상태는 애플리케이션 enum converter가 계속 검증한다.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class AccessRequestSchemaCompatibility(
    private val jdbcTemplate: JdbcTemplate,
) : CommandLineRunner {
    private val logger = LoggerFactory.getLogger(this::class.java)

    override fun run(vararg args: String) {
        if (databaseProductName() != "PostgreSQL") return

        val staleConstraints = jdbcTemplate.queryForList(
            """
            SELECT c.conname
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE n.nspname = current_schema()
              AND t.relname = 'access_requests'
              AND c.contype = 'c'
              AND pg_get_constraintdef(c.oid) ILIKE '%status%'
              AND pg_get_constraintdef(c.oid) NOT ILIKE '%PROFILE_REQUIRED%'
            """.trimIndent(),
            String::class.java,
        )

        staleConstraints.filterNotNull().forEach { constraintName ->
            require(constraintName.matches(SAFE_IDENTIFIER)) { "안전하지 않은 DB constraint 이름입니다" }
            jdbcTemplate.execute(
                "ALTER TABLE access_requests DROP CONSTRAINT IF EXISTS \"$constraintName\"",
            )
            logger.info("기존 access request status CHECK 제약을 제거했습니다: {}", constraintName)
        }
    }

    private fun databaseProductName(): String? =
        jdbcTemplate.dataSource?.connection?.use { it.metaData.databaseProductName }

    private companion object {
        val SAFE_IDENTIFIER = Regex("[A-Za-z0-9_]+")
    }
}
