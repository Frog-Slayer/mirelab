package com.mirelab.application.session

import com.mirelab.domain.session.Session
import java.time.Instant
import java.util.UUID

data class SessionResponse(
    val id: UUID,
    val studyId: UUID,
    val workId: UUID?,
    val meetAt: Instant?,
    val closed: Boolean,
)

fun Session.toResponse() = SessionResponse(
    id = id!!,
    studyId = study.id!!,
    workId = work?.id,
    meetAt = meetAt,
    closed = closed,
)
