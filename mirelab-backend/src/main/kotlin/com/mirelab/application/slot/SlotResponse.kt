package com.mirelab.application.slot

import com.mirelab.domain.slot.SlotDef
import com.mirelab.domain.slot.SlotOwner
import com.mirelab.domain.slot.SlotType
import com.mirelab.domain.slot.SlotValue
import com.mirelab.domain.slot.Visibility
import java.util.UUID

data class SlotDefResponse(
    val id: UUID,
    val name: String,
    val type: SlotType,
    val visibility: Visibility,
    val owner: SlotOwner,
    val sessionId: UUID?,
    val sortOrder: Int,
    val hidden: Boolean,
)

fun SlotDef.toResponse() = SlotDefResponse(
    id = id!!,
    name = name,
    type = type,
    visibility = visibility,
    owner = owner,
    sessionId = session?.id,
    sortOrder = sortOrder,
    hidden = hidden,
)

data class SlotValueResponse(
    val workId: UUID,
    val slotDefId: UUID,
    val userId: UUID,
    val value: Map<String, Any?>,
    val draft: Boolean,
    val published: Boolean,
)

fun SlotValue.toResponse() = SlotValueResponse(
    workId = work.id!!,
    slotDefId = slotDef.id!!,
    userId = user.id!!,
    value = value,
    draft = draft,
    published = published,
)

/** 작품 화면 하나를 그리는 데 필요한 칸 정의 + 값 전부 */
data class WorkSlotsResponse(
    val slots: List<SlotDefResponse>,
    val values: List<SlotValueResponse>,
)
