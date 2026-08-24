package com.mirelab.domain.user

object UsernamePolicy {
    private val pattern = Regex("^[a-z0-9][a-z0-9_-]{2,29}$")
    private val reserved = setOf("me", "admin", "api", "new", "settings")

    fun normalize(value: String): String = value.trim().lowercase()

    fun isAllowed(value: String): Boolean = pattern.matches(value) && value !in reserved
}
