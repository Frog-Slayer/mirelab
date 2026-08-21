import { ApiError, api } from '@/lib/api'
import { toSlotDef, toSlotValue, type SlotDefResponse, type SlotValueResponse } from '@/lib/slotApi'
import { toStudy, type StudyResponse } from '@/lib/studyApi'
import type { SlotDef, SlotValue, Study, Work, WorkKind } from '@/types'

export interface ShelfEntry {
  work: Work
  /** 이 책이 스터디에서 온 것이면 그 스터디 */
  study: Study | null
  values: SlotValue[]
}

export interface Shelf {
  slots: SlotDef[]
  entries: ShelfEntry[]
}

export interface ShelfDetail {
  work: Work
  study: Study | null
  slots: SlotDef[]
  values: SlotValue[]
}

interface ShelfEntryResponse {
  work: Work
  study: StudyResponse | null
  values: SlotValueResponse[]
}

interface ShelfResponse {
  slots: SlotDefResponse[]
  entries: ShelfEntryResponse[]
}

interface ShelfDetailResponse {
  work: Work
  study: StudyResponse | null
  slots: SlotDefResponse[]
  values: SlotValueResponse[]
}

function toShelfEntry(r: ShelfEntryResponse): ShelfEntry {
  return {
    work: r.work,
    study: r.study ? toStudy(r.study) : null,
    values: r.values.map(toSlotValue),
  }
}

export async function getShelf(userId: string): Promise<Shelf> {
  const res = await api.get<ShelfResponse>('/me/shelf', { headers: { 'X-User-Id': userId } })
  return { slots: res.slots.map(toSlotDef), entries: res.entries.map(toShelfEntry) }
}

export async function getShelfEntry(userId: string, workId: string): Promise<ShelfDetail | null> {
  try {
    const res = await api.get<ShelfDetailResponse>(`/me/shelf/${workId}`, {
      headers: { 'X-User-Id': userId },
    })
    return {
      work: res.work,
      study: res.study ? toStudy(res.study) : null,
      slots: res.slots.map(toSlotDef),
      values: res.values.map(toSlotValue),
    }
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export function addPersonalWork(input: {
  ownerId: string
  kind: WorkKind
  title: string
  author: string
  coverUrl?: string
  description?: string
}): Promise<Work> {
  return api.post(
    '/me/shelf',
    {
      kind: input.kind,
      title: input.title,
      author: input.author,
      coverUrl: input.coverUrl,
      description: input.description,
    },
    { headers: { 'X-User-Id': input.ownerId } },
  )
}

/** 내 서재 쪽 저장 — 스터디 작품 상세의 saveValue 와 달리 targetId 에 접두어 안 붙인다 */
export function saveShelfValue(input: {
  targetId: string
  slotDefId: string
  userId: string
  value: SlotValue['value']
  draft?: boolean
}): Promise<SlotValue> {
  return api
    .post<SlotValueResponse>(
      `/me/shelf/${input.targetId}/slot-values`,
      { slotDefId: input.slotDefId, value: input.value, draft: input.draft },
      { headers: { 'X-User-Id': input.userId } },
    )
    .then(toSlotValue)
}
