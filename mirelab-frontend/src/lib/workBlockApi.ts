import { api } from '@/lib/api'
import type { WorkBlock } from '@/types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 아직 실제 백엔드로 안 옮긴 작품은 workId가 목이 만든 문자열(w1 등)이라 UUID가
 * 아니다 — 그런 workId로 블록 API를 부르면 Spring이 400으로 거절한다. 호출 전에
 * 걸러서, 아직 안 옮긴 작품에서는 블록 기능 자체를 조용히 꺼둔다.
 */
export function isWorkBlockApiReady(workId: string): boolean {
  return UUID_RE.test(workId)
}

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
