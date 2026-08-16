// enum 대신 as const — tsconfig 의 erasableSyntaxOnly 때문에 enum 을 쓸 수 없다.

export const WorkKind = { BOOK: 'BOOK', MOVIE: 'MOVIE' } as const
export type WorkKind = (typeof WorkKind)[keyof typeof WorkKind]

/** 후보 = 읽고 싶은 것, 읽는 중 = 회차가 돌아가는 중, 완료 = 별점이 확정된 것 */
export const WorkStatus = {
  CANDIDATE: 'CANDIDATE',
  READING: 'READING',
  DONE: 'DONE',
} as const
export type WorkStatus = (typeof WorkStatus)[keyof typeof WorkStatus]

export const SlotType = {
  RATING: 'RATING',
  TEXT_SHORT: 'TEXT_SHORT',
  TEXT_LONG: 'TEXT_LONG',
  LIST: 'LIST',
  SHARED_ITEMS: 'SHARED_ITEMS',
} as const
export type SlotType = (typeof SlotType)[keyof typeof SlotType]

/** 개인별 = 사람마다 하나씩, 공동 = 회차에 하나 */
export const SlotScope = { PERSONAL: 'PERSONAL', SHARED: 'SHARED' } as const
export type SlotScope = (typeof SlotScope)[keyof typeof SlotScope]

export const Visibility = {
  ALWAYS: 'ALWAYS',
  AFTER_DEADLINE: 'AFTER_DEADLINE',
  PRIVATE: 'PRIVATE',
} as const
export type Visibility = (typeof Visibility)[keyof typeof Visibility]

/** 스터디 = 매 회차 등장, 회차 = 그 회차에만 (노션의 콜아웃 자리) */
export const SlotOwner = { STUDY: 'STUDY', SESSION: 'SESSION' } as const
export type SlotOwner = (typeof SlotOwner)[keyof typeof SlotOwner]

/**
 * 칸이 무엇에 붙는가.
 * 평점·한줄평은 책 한 권에 한 번이고, 줄거리·오늘 나온 이야기는 회차마다다.
 * 한 권을 여러 회차에 걸쳐 읽으니 이 둘을 구분하지 않으면 별점을 회차 수만큼 매기게 된다.
 */
export const SlotAttach = { SESSION: 'SESSION', WORK: 'WORK' } as const
export type SlotAttach = (typeof SlotAttach)[keyof typeof SlotAttach]

/** 일정 후보에 대한 각자의 표시 */
export const Availability = { YES: 'YES', MAYBE: 'MAYBE', NO: 'NO' } as const
export type Availability = (typeof Availability)[keyof typeof Availability]

/**
 * 사람. 스터디에 속하기 전에 존재한다.
 * 영서·호남처럼 두 스터디에 다 있는 사람이 있으므로 멤버십과 분리해야 한다.
 */
export interface User {
  id: string
  name: string
  color: string
}

export interface Study {
  id: string
  /** URL 에 쓰는 짧은 이름 */
  slug: string
  name: string
  /** 작품(책·영화)을 다루는 스터디인가. 끄면 라이브러리·명예의 전당이 없다 */
  hasWorks: boolean
  memberIds: string[]
}

export interface Work {
  id: string
  /** 스터디가 다루는 책. 개인이 혼자 담은 책은 없다 */
  studyId?: string
  /** 개인 서재에만 있는 책의 주인 */
  ownerId?: string
  kind: WorkKind
  title: string
  author: string
  year: number
  status: WorkStatus
  /** 이 책을 고른 사람 */
  addedBy?: string
  /** 왜 골랐는지. 명예의 전당에서 함께 보여준다 */
  reason?: string
}

export interface SlotDef {
  id: string
  studyId: string
  name: string
  type: SlotType
  scope: SlotScope
  attach: SlotAttach
  visibility: Visibility
  owner: SlotOwner
  allowMemo: boolean
  order: number
  hidden: boolean
  sessionId?: string
}

export interface Session {
  id: string
  studyId: string
  no: number
  /** 독서면 범위("4~6장"), 경제면 주제 */
  title: string
  /** 작품을 다루는 스터디에서만 */
  workId?: string
  /**
   * 모임 일시. 정해진 주기가 없어 매번 다르므로 만들 때는 비워둘 수 있다.
   * 미정이면 일정 탭에서 후보를 놓고 조율해 확정한다.
   */
  meetAt: string | null
  closed: boolean
}

export interface SharedItem {
  id: string
  text: string
}

export interface Memo {
  id: string
  targetId: string
  slotDefId: string
  itemId: string
  userId: string
  text: string
  isPrivate: boolean
}

export type SlotValueData =
  { n: number } | { text: string } | { items: string[] } | { shared: SharedItem[] }

export interface SlotValue {
  /** 붙는 대상의 id — 칸의 attach 에 따라 회차 id 이거나 작품 id 다 */
  targetId: string
  slotDefId: string
  /** 공동 칸은 작성자가 없다 */
  userId: string | null
  value: SlotValueData
  draft: boolean
}

/** 모임 날짜 조율. 확정된 뒤에도 다시 열 수 있다 */
export interface MeetingPoll {
  id: string
  studyId: string
  sessionId?: string
  question: string
  /** 후보 일시 */
  options: string[]
  /** 확정된 옵션 인덱스. null 이면 조율 중 */
  decided: number | null
}

export interface PollVote {
  pollId: string
  userId: string
  /** 옵션 인덱스 → 표시 */
  marks: Record<number, Availability>
}

/** 회차가 아닌 일정 — 휴회, 뒤풀이 등 */
export interface StudyEvent {
  id: string
  studyId: string
  at: string
  title: string
  note?: string
}
