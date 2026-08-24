package com.mirelab.application.shelf

import com.mirelab.application.slot.SlotDefResponse
import com.mirelab.application.slot.SlotValueResponse
import com.mirelab.application.study.StudyResponse
import com.mirelab.application.work.WorkResponse
import com.mirelab.domain.work.WorkKind
import com.mirelab.domain.work.WorkStatus
import java.util.UUID

data class ShelfEntryResponse(
    val work: WorkResponse,
    /** 이 책이 스터디에서 온 것이면 그 스터디, 개인 책이면 null */
    val study: StudyResponse?,
    val values: List<SlotValueResponse>,
)

/** 내 서재 목록 화면 — 개인 칸 정의(스터디에서 온 것 포함) + 책마다의 내 기록 */
data class ShelfResponse(
    val slots: List<SlotDefResponse>,
    val entries: List<ShelfEntryResponse>,
)

data class ShelfDetailResponse(
    val work: WorkResponse,
    val study: StudyResponse?,
    val slots: List<SlotDefResponse>,
    val values: List<SlotValueResponse>,
    val personalBodyJson: String?,
)

data class AddPersonalWorkRequest(
    val kind: WorkKind,
    val title: String,
    val author: String,
    val coverUrl: String? = null,
    val description: String? = null,
    val year: Int? = null,
)

data class ShelfSlotValueInput(
    val slotDefId: UUID,
    val value: Map<String, Any?>,
    val draft: Boolean?,
)

data class ShelfDocumentInput(val bodyJson: String?)

data class ShelfStatusInput(val status: WorkStatus)
