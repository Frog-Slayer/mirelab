package com.mirelab.application.work

import com.mirelab.domain.work.WorkKind
import com.mirelab.domain.work.WorkStatus
import java.util.UUID

data class CreateWorkRequest(
    val kind: WorkKind,
    val title: String,
    val author: String,
    val addedBy: UUID?,
    val reason: String?,
    val coverUrl: String? = null,
    val description: String? = null,
)

data class UpdateStatusRequest(val status: WorkStatus)

data class UpdateReasonRequest(val userId: UUID, val reason: String)

data class UpdateWorkInfoRequest(
    val title: String,
    val author: String,
    val description: String? = null,
    val coverUrl: String? = null,
)
