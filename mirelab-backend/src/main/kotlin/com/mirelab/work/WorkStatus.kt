package com.mirelab.work

/** 후보 = 읽고 싶은 것, 읽는 중 = 회차가 돌아가는 중, 완료 = 별점이 확정된 것 */
enum class WorkStatus {
    CANDIDATE,
    READING,
    DONE,
}
