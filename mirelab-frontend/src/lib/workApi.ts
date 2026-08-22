import { ApiError, api } from '@/lib/api'
import type { Session, Work, WorkKind } from '@/types'

export interface RankedWork extends Work {
  /** userId → 점수 */
  ratings: Record<string, number>
  /** 다른 멤버에게 공개된 평점의 userId */
  publishedRatingUserIds: string[]
  /** 평점을 남긴 userId 전체 — 비공개로 매긴 사람까지 포함한다(점수는 안 내려온다) */
  ratedUserIds: string[]
  average: number
  voterCount: number
}

export interface LibraryEntry extends RankedWork {
  sessionCount: number
}

export function getHallOfFame(slug: string): Promise<RankedWork[]> {
  return api.get(`/studies/${slug}/hall-of-fame`)
}

export function getLibrary(slug: string): Promise<LibraryEntry[]> {
  return api.get(`/studies/${slug}/works`)
}

/** 담은 사람(addedBy)은 서버가 토큰에서 정한다 */
export function addWork(input: {
  slug: string
  kind: WorkKind
  title: string
  author: string
  reason?: string
  coverUrl?: string
  description?: string
  year?: number
}): Promise<Work> {
  return api.post(`/studies/${input.slug}/works`, {
    kind: input.kind,
    title: input.title,
    author: input.author,
    reason: input.reason,
    coverUrl: input.coverUrl,
    description: input.description,
    year: input.year,
  })
}

export async function getWork(
  workId: string,
): Promise<{ work: RankedWork; sessions: Session[] } | null> {
  try {
    return await api.get(`/works/${workId}`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export function setWorkStatus(workId: string, status: Work['status']): Promise<void> {
  return api.patch(`/works/${workId}/status`, { status })
}

export function removeWork(workId: string): Promise<void> {
  return api.delete(`/works/${workId}`)
}

/** 선정 이유는 그 책을 담은 사람만 고칠 수 있다 — 서버가 토큰의 주체와 대조한다 */
export function updateWorkReason(input: { workId: string; reason: string }): Promise<void> {
  return api.patch(`/works/${input.workId}/reason`, { reason: input.reason })
}

export function updateWorkInfo(input: {
  workId: string
  title: string
  author: string
  description?: string
  coverUrl?: string
  year?: number
}): Promise<void> {
  return api.patch(`/works/${input.workId}`, {
    title: input.title,
    author: input.author,
    description: input.description,
    coverUrl: input.coverUrl,
    year: input.year,
  })
}
