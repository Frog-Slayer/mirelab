package com.mirelab.infra.user

import org.slf4j.LoggerFactory
import org.springframework.boot.CommandLineRunner
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Component

/** 인증 도입 전에 생성되어 role이 NULL인 기존 사용자 행을 현재 스키마 규칙에 맞춘다. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class UserSchemaCompatibility(
    private val jdbcTemplate: JdbcTemplate,
) : CommandLineRunner {
    private val logger = LoggerFactory.getLogger(this::class.java)

    override fun run(vararg args: String) {
        val updated = jdbcTemplate.update("UPDATE users SET role = 'MEMBER' WHERE role IS NULL")
        if (updated > 0) {
            logger.info("role이 없던 기존 사용자 {}명을 MEMBER로 보정했습니다", updated)
        }

        if (databaseProductName() == "PostgreSQL") {
            jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN role SET NOT NULL")
        }
    }

    private fun databaseProductName(): String? =
        jdbcTemplate.dataSource?.connection?.use { it.metaData.databaseProductName }
}
