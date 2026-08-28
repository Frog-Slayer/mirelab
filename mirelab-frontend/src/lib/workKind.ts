import { BookOpen, Film, Gamepad2 } from 'lucide-react'
import { WorkKind } from '@/types'

/** 종류를 보여주는 곳이 여러 군데라(카드·아카이브·목록) 라벨과 색을 여기 한 벌만 둔다 */
export const kindLabel: Record<WorkKind, string> = {
  [WorkKind.BOOK]: '책',
  [WorkKind.MOVIE]: '영화',
  [WorkKind.GAME]: '게임',
}

export const kindBadgeClass: Record<WorkKind, string> = {
  [WorkKind.BOOK]: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
  [WorkKind.MOVIE]: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
  [WorkKind.GAME]: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
}

export const kindIcon: Record<WorkKind, typeof BookOpen> = {
  [WorkKind.BOOK]: BookOpen,
  [WorkKind.MOVIE]: Film,
  [WorkKind.GAME]: Gamepad2,
}

/** 화면에 늘 같은 순서(책 → 영화 → 게임)로 늘어놓기 위한 목록 */
export const KIND_ORDER: WorkKind[] = [WorkKind.BOOK, WorkKind.MOVIE, WorkKind.GAME]
