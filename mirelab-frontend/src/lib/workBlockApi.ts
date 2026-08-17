import { api } from '@/lib/api'
import type { WorkBlock } from '@/types'

/**
 * "함께 쓰는 기록"의 블록 메타데이터(제목 등)는 실제 백엔드를 친다 — 목이 아니다.
 * 본문은 Yjs 라 실시간 서버가 다루고, 여기서 다루는 블록 id 는 실시간 서버가
 * 스냅샷을 붙이는 방(room) 이름과 그대로 같아야 한다. 목이 만드는 문자열 id 로는
 * Spring(UUID 컬럼)에 저장이 안 되므로, 이 부분만 real API 로 붙인다.
 */
export function getWorkBlocks(workId: string): Promise<WorkBlock[]> {
  return api.get(`/works/${workId}/blocks`)
}

export function addWorkBlock(input: {
  workId: string
  authorId: string
  title: string
}): Promise<WorkBlock> {
  return api.post(`/works/${input.workId}/blocks`, {
    authorId: input.authorId,
    title: input.title,
  })
}

export function updateWorkBlockTitle(input: { id: string; title: string }): Promise<void> {
  return api.patch(`/blocks/${input.id}`, { title: input.title })
}

export function removeWorkBlock(id: string): Promise<void> {
  return api.delete(`/blocks/${id}`)
}
