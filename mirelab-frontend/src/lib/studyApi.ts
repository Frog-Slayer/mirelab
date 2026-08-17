import { ApiError, api } from '@/lib/api'
import type { Study, User } from '@/types'

interface StudyResponse {
  id: string
  slug: string
  name: string
  hasWorks: boolean
}

// memberIds 는 어디서도 안 읽는다 — 실제 멤버 목록은 getStudyMembers 로 따로 받는다.
function toStudy(r: StudyResponse): Study {
  return { id: r.id, slug: r.slug, name: r.name, hasWorks: r.hasWorks, memberIds: [] }
}

/** 내가 속한 스터디들 — 로그인 전이라 헤더로 현재 사용자를 알린다 */
export async function getMyStudies(userId: string): Promise<Study[]> {
  const studies = await api.get<StudyResponse[]>('/studies/mine', {
    headers: { 'X-User-Id': userId },
  })
  return studies.map(toStudy)
}

export async function getStudy(slug: string): Promise<Study | null> {
  try {
    return toStudy(await api.get<StudyResponse>(`/studies/${slug}`))
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export function getStudyMembers(slug: string): Promise<User[]> {
  return api.get(`/studies/${slug}/members`)
}
