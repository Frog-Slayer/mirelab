package com.mirelab.infra.study

import com.mirelab.domain.study.Study
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface StudyRepository : JpaRepository<Study, UUID> {
    fun findBySlug(slug: String): Study?
}
