package com.mirelab.domain.note

/**
 * 메모의 종류. 담기는 내용은 다 글 한 덩이라 저장 모양은 같고, 다른 건 읽는 사람이
 * 나중에 이 글을 무엇으로 대하느냐다 — 그래서 칸(SlotDef)처럼 정의를 따로 두지 않고
 * 메모 자체가 제 종류를 들고 다닌다.
 */
enum class NoteKind {
    /** 그냥 적어두는 것 */
    MEMO,

    /** 나중에 물어보고 싶은 것 */
    QUESTION,

    /** 본문에서 옮겨 적은 것 */
    QUOTE,
}
