import { WorkStatus } from '@/types'

/**
 * 상태를 부르는 말은 여기 한 벌만 둔다. 예전에는 화면마다(작품 목록·작품 상세·서재 상세·
 * 표지 칸·수정 다이얼로그) 각자 표를 갖고 있어서 같은 상태가 어디선 '읽는 중', 어디선
 * '진행 중' 으로 불렸다 — 쓰는 사람에게는 다른 상태로 읽힌다.
 *
 * 배지 색은 아직 여기로 안 모았다. 작품 목록은 상태마다 다른 옅은 색으로, 작품 상세는
 * '진행 중' 하나만 emerald 로 칠하고 있어서 어느 쪽이 맞는지가 먼저 정해져야 한다.
 */
export const statusLabel: Record<WorkStatus, string> = {
  [WorkStatus.CANDIDATE]: '후보',
  /* '읽는 중' 이 아닌 이유: 목록에는 책만 있지 않다(영화·게임도 이 상태를 지난다). */
  [WorkStatus.READING]: '진행 중',
  [WorkStatus.DONE]: '완료',
}

/** 화면에 늘 같은 순서(후보 → 진행 중 → 완료)로 늘어놓기 위한 목록 */
export const STATUS_ORDER: WorkStatus[] = [
  WorkStatus.CANDIDATE,
  WorkStatus.READING,
  WorkStatus.DONE,
]

/** 상태로 걸러보는 화면들이 쓰는 필터 값 — 'ALL' 은 걸지 않은 상태 */
export type StatusFilter = 'ALL' | WorkStatus
