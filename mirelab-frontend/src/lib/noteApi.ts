import { api } from '@/lib/api'
import type { NoteKind, WorkNote } from '@/types'

/**
 * "내 메모" 서랍. 목이 아니라 실제 백엔드를 친다.
 *
 * 응답에는 부른 사람 자신의 메모만 실린다 — 서랍이 따로 걸러내지 않아도 되는 이유이자,
 * 이 목록을 남에게 보여주는 화면을 만들 수 없는 이유다.
 */
export function getWorkNotes(workId: string): Promise<WorkNote[]> {
  return api.get(`/works/${workId}/notes`)
}

/** 작성자는 서버가 토큰에서 정한다. 보통 빈 본문으로 만들고 곧바로 그 자리에 글을 쓴다 */
export function addWorkNote(input: { workId: string; kind: NoteKind }): Promise<WorkNote> {
  return api.post(`/works/${input.workId}/notes`, { kind: input.kind })
}

/** 종류만 바꾸는 편집과 본문만 고치는 자동저장이 따로 오므로 둘 다 선택이다 */
export function updateWorkNote(input: {
  id: string
  kind?: NoteKind
  body?: string
}): Promise<WorkNote> {
  return api.patch(`/notes/${input.id}`, { kind: input.kind, body: input.body })
}

export function removeWorkNote(id: string): Promise<void> {
  return api.delete(`/notes/${id}`)
}
