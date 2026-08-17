import { api } from '@/lib/api'
import type { Session } from '@/types'

/** "시작"·"일정 추가" — studyId 는 백엔드가 작품에서 derive 하므로 안 받는다 */
export function addSession(input: { workId: string; meetAt: string | null }): Promise<Session> {
  return api.post(`/works/${input.workId}/sessions`, { meetAt: input.meetAt })
}
