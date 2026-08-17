package com.mirelab.application.study

import com.mirelab.domain.study.Study
import java.util.UUID

data class StudyResponse(
    val id: UUID,
    val slug: String,
    val name: String,
    val hasWorks: Boolean,
)

fun Study.toResponse() = StudyResponse(id!!, slug, name, hasWorks)
