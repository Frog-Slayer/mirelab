import { ApiError, api } from '@/lib/api'
import { toStudy, type StudyResponse } from '@/lib/studyApi'
import type { Post, Study, Work, WorkKind, WorkRating } from '@/types'

export interface ShelfEntry {
  work: Work
  /** 이 책이 스터디에서 온 것이면 그 스터디 */
  study: Study | null
  /** 서재 주인의 평가. 안 남겼거나(남의 서재라면) 공개 안 했으면 null */
  rating: WorkRating | null
}

export interface Shelf {
  entries: ShelfEntry[]
}

export interface ShelfDetail {
  work: Work
  study: Study | null
  rating: WorkRating | null
  personalBodyJson: string | null
  publication: Post | null
}

interface ShelfEntryResponse {
  work: Work
  study: StudyResponse | null
  rating: WorkRating | null
}

interface ShelfResponse {
  entries: ShelfEntryResponse[]
}

interface ShelfDetailResponse {
  work: Work
  study: StudyResponse | null
  rating: WorkRating | null
  personalBodyJson: string | null
  publication: Post | null
}

function toShelfEntry(r: ShelfEntryResponse): ShelfEntry {
  return { work: r.work, study: r.study ? toStudy(r.study) : null, rating: r.rating }
}

export async function getShelf(): Promise<Shelf> {
  const res = await api.get<ShelfResponse>('/me/shelf')
  return { entries: res.entries.map(toShelfEntry) }
}

export async function getUserShelf(username: string): Promise<Shelf> {
  const res = await api.get<ShelfResponse>(`/users/${encodeURIComponent(username)}/shelf`)
  return { entries: res.entries.map(toShelfEntry) }
}

export async function getShelfEntry(workId: string): Promise<ShelfDetail | null> {
  try {
    const res = await api.get<ShelfDetailResponse>(`/me/shelf/${workId}`)
    return {
      work: res.work,
      study: res.study ? toStudy(res.study) : null,
      rating: res.rating,
      personalBodyJson: res.personalBodyJson,
      publication: res.publication,
    }
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export function saveShelfDocument(workId: string, bodyJson: string | null): Promise<void> {
  return api.patch(`/me/shelf/${workId}/document`, { bodyJson })
}

export function setShelfWorkStatus(workId: string, status: Work['status']): Promise<void> {
  return api.patch(`/me/shelf/${workId}/status`, { status })
}

export function setShelfPublication(
  workId: string,
  input: { title: string; published: boolean },
): Promise<Post> {
  return api.patch(`/me/shelf/${workId}/publication`, input)
}

/** 주인(ownerId)은 서버가 토큰에서 정한다 */
export function addPersonalWork(input: {
  kind: WorkKind
  title: string
  author: string
  coverUrl?: string
  description?: string
  year?: number
}): Promise<Work> {
  return api.post('/me/shelf', {
    kind: input.kind,
    title: input.title,
    author: input.author,
    coverUrl: input.coverUrl,
    description: input.description,
    year: input.year,
  })
}

/**
 * 개인 책의 평가 저장. 스터디 책은 이 경로로 못 쓴다 — 그 책의 평가는 작품 상세
 * 한 곳에서만 매긴다(`lib/ratingApi.ts`).
 */
export function saveShelfRating(input: {
  workId: string
  score?: number
  blurb?: string
}): Promise<WorkRating> {
  return api.put(`/me/shelf/${input.workId}/rating`, { score: input.score, blurb: input.blurb })
}
