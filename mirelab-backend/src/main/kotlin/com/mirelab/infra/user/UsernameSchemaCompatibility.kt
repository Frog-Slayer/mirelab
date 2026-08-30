package com.mirelab.infra.user

import java.util.UUID
import org.slf4j.LoggerFactory
import org.springframework.boot.CommandLineRunner
import org.springframework.core.annotation.Order
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Component

/** username 도입 전에 생성된 행을 채운 뒤 운영 PostgreSQL에서 NOT NULL로 고정한다. */
@Component
@Order(3)
class UsernameSchemaCompatibility(
    private val jdbcTemplate: JdbcTemplate,
) : CommandLineRunner {
    private val logger = LoggerFactory.getLogger(this::class.java)

    override fun run(vararg args: String) {
        val ids = jdbcTemplate.query("SELECT id FROM users WHERE username IS NULL OR username = ''") { row, _ ->
            row.getObject("id", UUID::class.java)
        }
        ids.forEach { id ->
            val compactId = id.toString().replace("-", "")
            val username = (8..24).firstNotNullOfOrNull { length ->
                val candidate = "user-${compactId.take(length)}"
                candidate.takeIf { !usernameExists(it) }
            } ?: error("기존 사용자 $id 의 임시 username을 만들 수 없습니다")
            jdbcTemplate.update("UPDATE users SET username = ? WHERE id = ?", username, id)
        }
        if (ids.isNotEmpty()) logger.info("username이 없던 기존 사용자 {}명을 보정했습니다", ids.size)

        if (databaseProductName() == "PostgreSQL") {
            jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN username SET NOT NULL")
        }
    }

    private fun usernameExists(username: String): Boolean =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM users WHERE username = ?",
            Int::class.java,
            username,
        ) != 0

    private fun databaseProductName(): String? =
        jdbcTemplate.dataSource?.connection?.use { it.metaData.databaseProductName }
}
