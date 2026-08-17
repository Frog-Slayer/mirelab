import { api } from '@/lib/api'
import type { Session, Work } from '@/types'

export interface ScheduleItem {
  kind: 'SESSION' | 'EVENT'
  at: string
  title: string
  note?: string
  sessionId?: string
  workId?: string
}

interface ScheduleItemResponse {
  sessionId: string
  workId: string | null
  title: string
  meetAt: string
  closed: boolean
}

/** 아직 백엔드에 이벤트(휴회·뒤풀이) 개념이 없어 세션만 내려온다 */
export function getSchedule(slug: string): Promise<ScheduleItem[]> {
  return api.get<ScheduleItemResponse[]>(`/studies/${slug}/schedule`).then((items) =>
    items.map((item) => ({
      kind: 'SESSION' as const,
      at: item.meetAt,
      title: item.title,
      sessionId: item.sessionId,
      workId: item.workId ?? undefined,
    })),
  )
}

export interface CurrentSession {
  session: Session
  work: Work | null
}

export function getCurrentSession(slug: string): Promise<CurrentSession | null> {
  return api.get(`/studies/${slug}/current-session`)
}
