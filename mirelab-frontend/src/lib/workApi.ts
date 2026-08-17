import { api } from '@/lib/api'
import type { Session, Work, WorkKind } from '@/types'

export interface RankedWork extends Work {
  /** userId → 점수 */
  ratings: Record<string, number>
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

export function addWork(input: {
  slug: string
  kind: WorkKind
  title: string
  author: string
  addedBy: string
  reason?: string
}): Promise<Work> {
  return api.post(`/studies/${input.slug}/works`, {
    kind: input.kind,
    title: input.title,
    author: input.author,
    addedBy: input.addedBy,
    reason: input.reason,
  })
}

export function getWork(workId: string): Promise<{ work: RankedWork; sessions: Session[] } | null> {
  return api.get(`/works/${workId}`)
}

export function setWorkStatus(workId: string, status: Work['status']): Promise<void> {
  return api.patch(`/works/${workId}/status`, { status })
}

export function removeWork(workId: string): Promise<void> {
  return api.delete(`/works/${workId}`)
}

export function updateWorkReason(input: {
  workId: string
  userId: string
  reason: string
}): Promise<void> {
  return api.patch(`/works/${input.workId}/reason`, { userId: input.userId, reason: input.reason })
}
