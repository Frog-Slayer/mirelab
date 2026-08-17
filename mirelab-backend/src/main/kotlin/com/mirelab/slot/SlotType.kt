package com.mirelab.slot

/**
 * 칸 타입 — 어떤 UI로 그리고 어떻게 저장하나.
 * 공동 칸(항목 목록+메모)은 지금 범위에서 제외한다 — [SlotValue] 참고.
 */
enum class SlotType {
    RATING,
    TEXT_SHORT,
    TEXT_LONG,
    LIST,
}
