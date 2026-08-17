package com.mirelab.study

import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface StudyRepository : JpaRepository<Study, UUID> {
    fun findBySlug(slug: String): Study?
}
