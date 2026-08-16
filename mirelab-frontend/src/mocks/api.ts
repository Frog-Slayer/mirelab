import type {
  Availability,
  MeetingPoll,
  Memo,
  PollVote,
  SlotDef,
  SlotValue,
  Study,
  StudyEvent,
  User,
  Session,
  Work,
  WorkBlock,
} from '@/types'
import { SlotOwner, SlotScope, SlotType, Visibility, WorkStatus } from '@/types'
import * as seed from './data'

// 백엔드가 생기기 전까지 쓰는 인메모리 목. 화면이 실제로 동작하는지 보기 위한 것이라
// 새로고침하면 초기 상태로 돌아간다. 나중에 lib/api.ts 호출로 갈아끼운다.
const db = {
  users: structuredClone(seed.users),
  studies: structuredClone(seed.studies),
  works: structuredClone(seed.works),
  sessions: structuredClone(seed.sessions),
  slotDefs: structuredClone(seed.slotDefs),
  slotValues: structuredClone(seed.slotValues),
  memos: structuredClone(seed.memos),
  polls: structuredClone(seed.meetingPolls),
  votes: structuredClone(seed.pollVotes),
  events: structuredClone(seed.studyEvents),
  workBlocks: structuredClone(seed.workBlocks),
}

let seq = 100
const nextId = (prefix: string) => `${prefix}${seq++}`

function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms))
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

// ─── 사람 · 스터디 ─────────────────────────────────────────

export function getUsers(): Promise<User[]> {
  return delay(db.users)
}

export function getStudies(): Promise<Study[]> {
  return delay(db.studies)
}

/** 내가 속한 스터디만 */
export function getMyStudies(userId: string): Promise<Study[]> {
  return delay(db.studies.filter((s) => s.memberIds.includes(userId)))
}

export function getStudy(slug: string): Promise<Study | null> {
  return delay(db.studies.find((s) => s.slug === slug) ?? null)
}

/** 그 스터디에 속한 사람들 */
export function getStudyMembers(studyId: string): Promise<User[]> {
  const study = db.studies.find((s) => s.id === studyId)
  return delay(study ? db.users.filter((u) => study.memberIds.includes(u.id)) : [])
}

// ─── 명예의 전당 ───────────────────────────────────────────

export interface RankedWork extends Work {
  /** userId → 점수 */
  ratings: Record<string, number>
  average: number
  voterCount: number
  distribution: number[]
}

/** 그 스터디의 평점 칸 */
function workRatingSlotId(studyId: string | undefined): string | undefined {
  if (!studyId) return undefined
  return db.slotDefs.find((s) => s.studyId === studyId && s.type === SlotType.RATING && !s.hidden)
    ?.id
}

function rank(work: Work): RankedWork {
  const slotId = workRatingSlotId(work.studyId)
  const ratings: Record<string, number> = {}
  for (const v of db.slotValues) {
    if (v.targetId !== work.id || v.slotDefId !== slotId || v.draft || !v.userId) continue
    if ('n' in v.value) ratings[v.userId] = v.value.n
  }
  const scores = Object.values(ratings)
  const distribution = [0, 0, 0, 0, 0]
  for (const n of scores) distribution[Math.min(4, Math.max(0, Math.round(n) - 1))] += 1
  return { ...work, ratings, average: average(scores), voterCount: scores.length, distribution }
}

export type HallSort = 'rating' | 'recent'

export function getHallOfFame(studyId: string, sort: HallSort = 'rating'): Promise<RankedWork[]> {
  // 별점이 확정된 것만 순위에 올린다. 후보와 읽는 중은 라이브러리에 있다.
  const ranked = db.works
    .filter((w) => w.studyId === studyId && w.status === WorkStatus.DONE)
    .map(rank)
  const order = db.sessions.map((w) => w.workId)
  ranked.sort((a, b) =>
    sort === 'rating' ? b.average - a.average : order.indexOf(a.id) - order.indexOf(b.id),
  )
  return delay(ranked)
}

export function getWork(workId: string): Promise<{ work: RankedWork; sessions: Session[] } | null> {
  const work = db.works.find((w) => w.id === workId)
  if (!work) return delay(null)
  // db.sessions 는 최신이 앞이다 — 오래된 순으로 뒤집어 보여준다.
  const sessions = db.sessions
    .filter((w) => w.workId === workId)
    .slice()
    .reverse()
  return delay({ work: rank(work), sessions })
}

// ─── 라이브러리 ────────────────────────────────────────────

export interface LibraryEntry extends RankedWork {
  sessionCount: number
}

export function getLibrary(studyId: string): Promise<LibraryEntry[]> {
  const entries = db.works
    .filter((w) => w.studyId === studyId)
    .map((work) => ({
      ...rank(work),
      sessionCount: db.sessions.filter((w) => w.workId === work.id).length,
    }))
  return delay(entries)
}

export function addWork(input: {
  studyId: string
  kind: Work['kind']
  title: string
  author: string
  addedBy: string
  reason?: string
}): Promise<Work> {
  const created: Work = {
    id: nextId('w'),
    studyId: input.studyId,
    kind: input.kind,
    title: input.title,
    author: input.author,
    year: new Date().getFullYear(),
    status: WorkStatus.CANDIDATE,
    addedBy: input.addedBy,
    reason: input.reason,
  }
  db.works.push(created)
  return delay(created)
}

export function setWorkStatus(workId: string, status: WorkStatus): Promise<void> {
  const work = db.works.find((w) => w.id === workId)
  if (work) work.status = status
  return delay(undefined, 60)
}

/** 후보만, 그리고 기록이 없을 때만 지운다. 화면에서 막지만 여기서도 막는다 */
export function removeWork(workId: string): Promise<void> {
  const work = db.works.find((w) => w.id === workId)
  if (!work || work.status !== WorkStatus.CANDIDATE) return delay(undefined, 0)
  if (db.sessions.some((w) => w.workId === workId)) return delay(undefined, 0)
  if (rank(work).voterCount > 0) return delay(undefined, 0)
  db.works = db.works.filter((w) => w.id !== workId)
  return delay(undefined, 60)
}

// ─── 회차 ─────────────────────────────────────────────────

export interface SessionSummary {
  session: Session
  work: Work | null
  submitted: string[]
  pending: string[]
}

function summarize(session: Session): SessionSummary {
  const study = db.studies.find((s) => s.id === session.studyId)!
  const personalIds = new Set(
    db.slotDefs
      .filter((s) => s.studyId === session.studyId && s.scope === SlotScope.PERSONAL)
      .map((s) => s.id),
  )
  // 값은 작품에 붙으므로 "제출"도 이 회차만이 아니라 이 작품 전체 기준이다.
  const targetId = session.workId
  const submitted = targetId
    ? study.memberIds.filter((uid) =>
        db.slotValues.some(
          (v) => v.targetId === targetId && v.userId === uid && personalIds.has(v.slotDefId) && !v.draft,
        ),
      )
    : []

  return {
    session,
    work: db.works.find((w) => w.id === session.workId) ?? null,
    submitted,
    pending: study.memberIds.filter((uid) => !submitted.includes(uid)),
  }
}

/** 진행 중인 회차 = 안 끝난 것 중 가장 가까운 날. 날짜 미정은 뒤로 민다 */
export function getCurrentSession(studyId: string): Promise<SessionSummary | null> {
  const session = db.sessions
    .filter((s) => s.studyId === studyId && !s.closed)
    .sort((a, b) => (a.meetAt ?? '9999').localeCompare(b.meetAt ?? '9999'))[0]
  return delay(session ? summarize(session) : null)
}

export function addSession(input: {
  studyId: string
  workId?: string
  meetAt: string | null
}): Promise<Session> {
  const created: Session = {
    id: nextId('k'),
    studyId: input.studyId,
    workId: input.workId,
    meetAt: input.meetAt,
    closed: false,
  }
  // 최신을 앞에 둔다 — db.sessions 는 항상 이 순서를 유지한다.
  db.sessions.unshift(created)
  // 모임이 잡히면 그 작품은 읽는 중이 된다
  const work = db.works.find((w) => w.id === input.workId)
  if (work && work.status === WorkStatus.CANDIDATE) work.status = WorkStatus.READING
  return delay(created)
}

export function getSessions(studyId: string): Promise<SessionSummary[]> {
  return delay(db.sessions.filter((w) => w.studyId === studyId).map(summarize))
}

/** 모임 화면은 일정·제출 현황 확인용이다 — 기록은 전부 작품 상세에서 쓴다 */
export function getSession(sessionId: string): Promise<SessionSummary | null> {
  const session = db.sessions.find((w) => w.id === sessionId)
  return delay(session ? summarize(session) : null)
}

/**
 * 남의 칸을 볼 수 있는지. 비공개는 영원히, 마감 후 공개는 마감 전까지 가린다.
 * 백엔드가 생기면 이 판단은 서버에서 해야 한다 — 값을 아예 안 내려보내는 쪽으로.
 */
export function canSee(
  slot: SlotDef,
  session: Session,
  viewerId: string,
  ownerId: string,
): boolean {
  if (viewerId === ownerId) return true
  if (slot.visibility === Visibility.PRIVATE) return false
  if (slot.visibility === Visibility.AFTER_DEADLINE) return session.closed
  return true
}

// ─── 칸 값 쓰기 ────────────────────────────────────────────

export function saveValue(input: {
  targetId: string
  slotDefId: string
  userId: string | null
  value: SlotValue['value']
  draft?: boolean
}): Promise<SlotValue> {
  const found = db.slotValues.find(
    (v) =>
      v.targetId === input.targetId && v.slotDefId === input.slotDefId && v.userId === input.userId,
  )
  if (found) {
    found.value = input.value
    if (input.draft !== undefined) found.draft = input.draft
    return delay(found, 60)
  }
  const created: SlotValue = {
    targetId: input.targetId,
    slotDefId: input.slotDefId,
    userId: input.userId,
    value: input.value,
    draft: input.draft ?? true,
  }
  db.slotValues.push(created)
  return delay(created, 60)
}

export function publish(targetId: string, userId: string): Promise<void> {
  for (const v of db.slotValues) {
    if (v.targetId === targetId && v.userId === userId) v.draft = false
  }
  return delay(undefined)
}

// ─── 메모 ─────────────────────────────────────────────────

export function addMemo(input: Omit<Memo, 'id'>): Promise<Memo> {
  const memo: Memo = { ...input, id: nextId('mo') }
  db.memos.push(memo)
  return delay(memo, 60)
}

export function removeMemo(memoId: string): Promise<void> {
  db.memos = db.memos.filter((m) => m.id !== memoId)
  return delay(undefined, 60)
}

// ─── 내 기록 ───────────────────────────────────────────────

export interface MyWorkEntry {
  work: Work
  values: SlotValue[]
}

/** 작품에 붙은 내 기록 — 모든 칸 값은 책 한 권 단위로 쌓인다 */
export function getMyWorkRecords(studyId: string, userId: string): Promise<MyWorkEntry[]> {
  const workSlotIds = new Set(db.slotDefs.filter((s) => s.studyId === studyId).map((s) => s.id))
  const entries = db.works
    .filter((w) => w.studyId === studyId)
    .map((work) => ({
      work,
      values: db.slotValues.filter(
        (v) => v.targetId === work.id && v.userId === userId && workSlotIds.has(v.slotDefId),
      ),
    }))
    .filter((e) => e.values.length > 0)
  return delay(entries)
}

export interface WorkSlots {
  slots: SlotDef[]
  values: SlotValue[]
}

export function getWorkSlots(studyId: string, workId: string): Promise<WorkSlots> {
  const slots = db.slotDefs
    .filter((s) => s.studyId === studyId && !s.hidden)
    // 콜아웃 칸(owner: SESSION)은 그 모임이 이 작품 소관일 때만 보여준다.
    .filter(
      (s) =>
        s.owner === SlotOwner.STUDY ||
        db.sessions.find((se) => se.id === s.sessionId)?.workId === workId,
    )
    .sort((a, b) => a.order - b.order)
  return delay({
    slots,
    values: db.slotValues.filter((v) => v.targetId === workId),
  })
}

// ─── 함께 쓰는 기록 ─────────────────────────────────────────

export function getWorkBlocks(workId: string): Promise<WorkBlock[]> {
  return delay(
    db.workBlocks
      .filter((b) => b.workId === workId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  )
}

export function addWorkBlock(input: {
  workId: string
  authorId: string
  title: string
  body: string
}): Promise<WorkBlock> {
  const created: WorkBlock = { ...input, id: nextId('blk'), createdAt: new Date().toISOString() }
  db.workBlocks.push(created)
  return delay(created)
}

export function updateWorkBlock(input: {
  id: string
  title: string
  body: string
}): Promise<WorkBlock | null> {
  const block = db.workBlocks.find((b) => b.id === input.id)
  if (!block) return delay(null)
  block.title = input.title
  block.body = input.body
  return delay(block)
}

export function removeWorkBlock(id: string): Promise<void> {
  db.workBlocks = db.workBlocks.filter((b) => b.id !== id)
  return delay(undefined)
}

// ─── 칸 관리 ───────────────────────────────────────────────

export function getSlotDefs(studyId: string): Promise<SlotDef[]> {
  return delay(db.slotDefs.filter((s) => s.studyId === studyId).sort((a, b) => a.order - b.order))
}

export function addSlotDef(input: {
  studyId: string
  name: string
  type: SlotType
  scope: SlotDef['scope']
  visibility: SlotDef['visibility']
}): Promise<SlotDef> {
  const siblings = db.slotDefs.filter((s) => s.studyId === input.studyId)
  const created: SlotDef = {
    id: nextId('s'),
    studyId: input.studyId,
    name: input.name,
    type: input.type,
    scope: input.scope,
    visibility: input.visibility,
    owner: SlotOwner.STUDY,
    allowMemo: input.scope === SlotScope.SHARED,
    order: Math.max(0, ...siblings.map((s) => s.order)) + 1,
    hidden: false,
  }
  db.slotDefs.push(created)
  return delay(created)
}

/** 지우지 않고 숨긴다 — 과거 회차의 기록은 남아야 한다 */
export function toggleSlotHidden(slotDefId: string): Promise<void> {
  const slot = db.slotDefs.find((s) => s.id === slotDefId)
  if (slot) slot.hidden = !slot.hidden
  return delay(undefined, 60)
}

export function moveSlot(slotDefId: string, direction: -1 | 1): Promise<void> {
  const target = db.slotDefs.find((s) => s.id === slotDefId)
  if (!target) return delay(undefined, 0)
  const sorted = db.slotDefs
    .filter((s) => s.studyId === target.studyId)
    .sort((a, b) => a.order - b.order)
  const index = sorted.findIndex((s) => s.id === slotDefId)
  const swapWith = index + direction
  if (swapWith < 0 || swapWith >= sorted.length) return delay(undefined, 0)
  const a = sorted[index]
  const b = sorted[swapWith]
  const tmp = a.order
  a.order = b.order
  b.order = tmp
  return delay(undefined, 60)
}

// ─── 일정 ─────────────────────────────────────────────────

export interface ScheduleItem {
  kind: 'SESSION' | 'EVENT'
  at: string
  title: string
  note?: string
  sessionId?: string
}

export function getSchedule(studyId: string): Promise<ScheduleItem[]> {
  const fromSessions: ScheduleItem[] = db.sessions
    // 날짜가 안 잡힌 모임은 달력에 놓을 자리가 없다
    .filter((w) => w.studyId === studyId && w.meetAt)
    .map((w) => ({
      kind: 'SESSION',
      at: w.meetAt!,
      title: db.works.find((x) => x.id === w.workId)?.title ?? '모임',
      sessionId: w.id,
    }))
  const fromEvents: ScheduleItem[] = db.events
    .filter((e) => e.studyId === studyId)
    .map((e) => ({ kind: 'EVENT', at: e.at, title: e.title, note: e.note }))

  return delay([...fromSessions, ...fromEvents].sort((a, b) => a.at.localeCompare(b.at)))
}

export function addEvent(input: Omit<StudyEvent, 'id'>): Promise<StudyEvent> {
  const created: StudyEvent = { ...input, id: nextId('ev') }
  db.events.push(created)
  return delay(created)
}

export interface PollDetail {
  poll: MeetingPoll
  votes: PollVote[]
  /** 옵션별 YES 수 — 가장 많은 것이 추천안 */
  tally: Array<{ yes: number; maybe: number; no: number }>
}

export function getPolls(studyId: string): Promise<PollDetail[]> {
  const details = db.polls
    .filter((p) => p.studyId === studyId)
    .map((poll) => {
      const votes = db.votes.filter((v) => v.pollId === poll.id)
      const tally = poll.options.map((_, i) => {
        const marks = votes.map((v) => v.marks[i])
        return {
          yes: marks.filter((m) => m === 'YES').length,
          maybe: marks.filter((m) => m === 'MAYBE').length,
          no: marks.filter((m) => m === 'NO').length,
        }
      })
      return { poll, votes, tally }
    })
  return delay(details)
}

export function vote(input: {
  pollId: string
  userId: string
  optionIndex: number
  mark: Availability
}): Promise<void> {
  let found = db.votes.find((v) => v.pollId === input.pollId && v.userId === input.userId)
  if (!found) {
    found = { pollId: input.pollId, userId: input.userId, marks: {} }
    db.votes.push(found)
  }
  found.marks[input.optionIndex] = input.mark
  return delay(undefined, 60)
}

/** 확정하면 연결된 회차의 모임 시각도 같이 옮긴다 */
export function decidePoll(pollId: string, optionIndex: number | null): Promise<void> {
  const poll = db.polls.find((p) => p.id === pollId)
  if (!poll) return delay(undefined, 0)
  poll.decided = optionIndex
  if (optionIndex !== null && poll.sessionId) {
    const session = db.sessions.find((w) => w.id === poll.sessionId)
    if (session) session.meetAt = poll.options[optionIndex]
  }
  return delay(undefined, 60)
}

export function addPoll(input: {
  studyId: string
  sessionId?: string
  question: string
  options: string[]
}): Promise<MeetingPoll> {
  const created: MeetingPoll = { ...input, id: nextId('p'), decided: null }
  db.polls.push(created)
  return delay(created)
}

// ─── 책 검색 ───────────────────────────────────────────────
// 나중에 알라딘 OpenAPI 로 바뀔 자리. 지금은 작은 목 카탈로그에서 찾는다.
// 표지 URL 은 등록 시점에 받아서 우리 쪽에 보관해야 한다 — 외부 URL 은 나중에 깨진다.

export interface BookHit {
  title: string
  author: string
  year: number
  publisher: string
  pages: number
}

const catalog: BookHit[] = [
  { title: '사피엔스', author: '유발 하라리', year: 2015, publisher: '김영사', pages: 636 },
  { title: '호모 데우스', author: '유발 하라리', year: 2017, publisher: '김영사', pages: 636 },
  {
    title: '21세기를 위한 21가지 제언',
    author: '유발 하라리',
    year: 2018,
    publisher: '김영사',
    pages: 444,
  },
  {
    title: '총, 균, 쇠',
    author: '재레드 다이아몬드',
    year: 1997,
    publisher: '문학사상',
    pages: 750,
  },
  { title: '대변동', author: '재레드 다이아몬드', year: 2019, publisher: '김영사', pages: 592 },
  { title: '파친코 1', author: '이민진', year: 2022, publisher: '인플루엔셜', pages: 464 },
  { title: '팩트풀니스', author: '한스 로슬링', year: 2019, publisher: '김영사', pages: 468 },
  {
    title: '정의란 무엇인가',
    author: '마이클 샌델',
    year: 2010,
    publisher: '와이즈베리',
    pages: 444,
  },
  { title: '코스모스', author: '칼 세이건', year: 1980, publisher: '사이언스북스', pages: 719 },
  {
    title: '이기적 유전자',
    author: '리처드 도킨스',
    year: 1976,
    publisher: '을유문화사',
    pages: 632,
  },
]

export function searchBooks(query: string): Promise<BookHit[]> {
  const q = query.trim()
  if (!q) return delay([], 0)
  const hits = catalog.filter((b) => b.title.includes(q) || b.author.includes(q))
  return delay(hits, 200)
}

/**
 * 선정 이유는 그 책을 담은 사람만 고칠 수 있다.
 * 화면에서도 막지만 여기서도 막는다 — 권한은 서버가 최종 판단해야 한다.
 */
export function updateWorkReason(input: {
  workId: string
  userId: string
  reason: string
}): Promise<void> {
  const work = db.works.find((w) => w.id === input.workId)
  if (!work || work.addedBy !== input.userId) return delay(undefined, 0)
  work.reason = input.reason
  return delay(undefined, 60)
}

// ─── 내 서재 (전역) ────────────────────────────────────────
// 개인 기록은 스터디 페이지가 아니라 여기에 쓴다.
// 스터디에서 다룬 책은 자동으로 들어오고, 혼자 읽은 책도 담을 수 있다.

export interface ShelfEntry {
  work: Work
  /** 이 책이 스터디에서 온 것이면 그 스터디 */
  study: Study | null
  values: SlotValue[]
}

export interface Shelf {
  /** 개인 칸 정의 — 목이라 내가 속한 첫 스터디 것을 쓴다 */
  slots: SlotDef[]
  entries: ShelfEntry[]
}

/**
 * 내 서재 안에서 쓰는 값의 targetId. 스터디에서 온 책은 스터디 쪽 기록(targetId = work.id)과
 * 겹치지 않도록 접두어를 붙여 따로 둔다 — 내 서재 기록과 스터디 기록은 서로 다른 장부다.
 */
function shelfTargetId(work: Work): string {
  return work.studyId ? `shelf:${work.id}` : work.id
}

export function getShelf(userId: string): Promise<Shelf> {
  const myStudies = db.studies.filter((s) => s.memberIds.includes(userId))
  const myStudyIds = new Set(myStudies.map((s) => s.id))

  const slots = db.slotDefs
    .filter((s) => myStudyIds.has(s.studyId) && !s.hidden && s.scope === SlotScope.PERSONAL)
    .sort((a, b) => a.order - b.order)

  const slotIds = new Set(slots.map((s) => s.id))

  const entries = db.works
    .filter((w) => (w.studyId && myStudyIds.has(w.studyId)) || w.ownerId === userId)
    .map((work) => ({
      work,
      study: db.studies.find((s) => s.id === work.studyId) ?? null,
      values: db.slotValues.filter(
        (v) => v.targetId === shelfTargetId(work) && v.userId === userId && slotIds.has(v.slotDefId),
      ),
    }))

  return delay({ slots, entries })
}

export function addPersonalWork(input: {
  ownerId: string
  kind: Work['kind']
  title: string
  author: string
}): Promise<Work> {
  const created: Work = {
    id: nextId('p'),
    ownerId: input.ownerId,
    kind: input.kind,
    title: input.title,
    author: input.author,
    year: new Date().getFullYear(),
    status: WorkStatus.READING,
  }
  db.works.push(created)
  return delay(created)
}

export interface ShelfDetail {
  work: Work
  /** 스터디에서 온 책이면 그 스터디. 개인 책이면 null */
  study: Study | null
  slots: SlotDef[]
  values: SlotValue[]
}

/**
 * 내 서재의 책 하나. 회차는 끼어들지 않고, 스터디에서 온 책이라도 여기 기록은
 * 스터디 쪽 작품 상세의 기록과 별개다 — 각자 자기 targetId 를 쓴다.
 */
export function getShelfEntry(userId: string, workId: string): Promise<ShelfDetail | null> {
  const work = db.works.find((w) => w.id === workId)
  if (!work) return delay(null)

  const myStudies = db.studies.filter((s) => s.memberIds.includes(userId))
  const myStudyIds = new Set(myStudies.map((s) => s.id))
  const mine = (work.studyId && myStudyIds.has(work.studyId)) || work.ownerId === userId
  if (!mine) return delay(null)

  const slots = db.slotDefs
    .filter((s) => myStudyIds.has(s.studyId) && !s.hidden && s.scope === SlotScope.PERSONAL)
    .sort((a, b) => a.order - b.order)

  return delay({
    work,
    study: db.studies.find((s) => s.id === work.studyId) ?? null,
    slots,
    values: db.slotValues.filter(
      (v) => v.targetId === shelfTargetId(work) && v.userId === userId,
    ),
  })
}
