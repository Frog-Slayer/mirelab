package com.mirelab.domain.slot

/**
 * 같은 작품·칸·사람이라도 스터디 공식 기록과 내 서재 개인 기록은 다른 값일 수 있다.
 * 프론트 목은 이걸 `targetId` 에 `shelf:` 접두어를 붙이는 식으로 흉내냈는데(문자열이라
 * 가능했던 임시방편), 실제 스키마에서는 `work_id` 가 진짜 외래키라 그 수법을 못 쓴다.
 * 대신 이 구분 컬럼을 둔다 — (work, slotDef, user) 가 같아도 컨텍스트가 다르면 별개 값.
 */
enum class SlotValueContext {
    /** 스터디 작품 상세 — 명예의 전당 랭킹 등 공동 계산에 들어간다 */
    STUDY,

    /** 내 서재 — 이 사람만의 개인 기록. 스터디 집계에 안 들어간다 */
    SHELF,
}
