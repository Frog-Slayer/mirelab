import { api } from '@/lib/api'
import { openLiveStream } from '@/lib/liveStream'
import type { SlotDef, SlotValue } from '@/types'
import { SlotScope } from '@/types'

export interface SlotDefResponse {
  id: string
  name: string
  type: SlotDef['type']
  visibility: SlotDef['visibility']
  owner: SlotDef['owner']
  sessionId: string | null
  sortOrder: number
  hidden: boolean
}

export interface SlotValueResponse {
  workId: string
  slotDefId: string
  userId: string
  value: SlotValue['value']
  draft: boolean
  published: boolean
}

interface WorkSlotsResponse {
  slots: SlotDefResponse[]
  values: SlotValueResponse[]
}

// studyId·scope는 백엔드 응답에 없다 — 개인 칸만 다루니 scope는 항상 PERSONAL 로
// 채워 넣고, studyId 는 화면 어디서도 안 읽어서 빈 값으로 둔다.
export function toSlotDef(r: SlotDefResponse): SlotDef {
  return {
    id: r.id,
    studyId: '',
    name: r.name,
    type: r.type,
    scope: SlotScope.PERSONAL,
    visibility: r.visibility,
    owner: r.owner,
    order: r.sortOrder,
    hidden: r.hidden,
    sessionId: r.sessionId ?? undefined,
  }
}

export function toSlotValue(r: SlotValueResponse): SlotValue {
  return {
    targetId: r.workId,
    slotDefId: r.slotDefId,
    userId: r.userId,
    value: r.value,
    draft: r.draft,
    published: r.published,
  }
}

/**
 * 보는 사람이 누구냐에 따라 비공개·마감 전 칸 값이 서버에서 걸러진다 — 그 기준은
 * access token 의 주체이고, 응답에는 아예 안 실려 온다.
 */
export async function getWorkSlots(
  workId: string,
): Promise<{ slots: SlotDef[]; values: SlotValue[] }> {
  const res = await api.get<WorkSlotsResponse>(`/works/${workId}/slots`)
  return { slots: res.slots.map(toSlotDef), values: res.values.map(toSlotValue) }
}

export function saveValue(input: {
  targetId: string
  slotDefId: string
  value: SlotValue['value']
  draft?: boolean
}): Promise<SlotValue> {
  return api
    .post<SlotValueResponse>(`/works/${input.targetId}/slot-values`, {
      slotDefId: input.slotDefId,
      value: input.value,
      draft: input.draft,
    })
    .then(toSlotValue)
}

export function setRatingPublished(workId: string, published: boolean): Promise<void> {
  return api.patch(`/works/${workId}/rating-visibility`, { published })
}

/**
 * 이 작품의 칸 값이 누구에 의해서든 바뀌면 신호가 온다 — 내용은 없으니 받는 쪽이 평소
 * 경로로 다시 받아가면 된다. 끊을 때 부를 함수를 돌려준다.
 */
export function openWorkSlotEvents(
  workId: string,
  handlers: { onEvent: () => void; onConnectedChange?: (connected: boolean) => void },
): () => void {
  return openLiveStream(`/works/${workId}/slot-events`, handlers)
}
