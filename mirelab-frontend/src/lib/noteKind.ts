import { NoteKind } from '@/types'

/**
 * 메모 종류를 부르는 말과 늘어놓는 순서. 서랍의 추가 버튼과 카드 메뉴가 같은 표를 봐야
 * 한 화면 안에서 같은 종류가 다른 이름으로 불리지 않는다([statusLabel] 과 같은 이유).
 */
export const noteKindLabel: Record<NoteKind, string> = {
  [NoteKind.MEMO]: '메모',
  [NoteKind.QUESTION]: '질문',
  [NoteKind.QUOTE]: '인용',
}

/** 비어 있는 칸에 적어 두는 말 — 종류마다 무엇을 적는 자리인지 다르다 */
export const noteKindPlaceholder: Record<NoteKind, string> = {
  [NoteKind.MEMO]: '떠오른 것을 그대로',
  [NoteKind.QUESTION]: '모임에서 물어보고 싶은 것',
  [NoteKind.QUOTE]: '옮겨 적고 싶은 문장',
}

/**
 * 그 종류가 하나도 없을 때의 말. 한 벌로 적어 두는 이유는 조사 때문이다 —
 * "메모가 / 질문이" 처럼 받침에 따라 달라져서 이름만 갈아 끼우면 어색해진다.
 */
export const noteKindEmpty: Record<NoteKind, string> = {
  [NoteKind.MEMO]: '아직 남긴 메모가 없어요.',
  [NoteKind.QUESTION]: '아직 남긴 질문이 없어요.',
  [NoteKind.QUOTE]: '아직 옮겨 적은 문장이 없어요.',
}

/**
 * 배지 색. 종류를 글자로 이미 적어 두었으니 색은 거드는 정도로만 옅게 — 셋이 서로
 * 다투면 정작 읽어야 할 본문보다 배지가 먼저 눈에 든다.
 */
export const noteKindTone: Record<NoteKind, string> = {
  [NoteKind.MEMO]: 'bg-neutral-100 text-neutral-600',
  [NoteKind.QUESTION]: 'bg-emerald-50 text-emerald-700',
  [NoteKind.QUOTE]: 'bg-amber-50 text-amber-800',
}

/** 흔한 것부터 — 필터 칩과 카드 메뉴가 늘 이 순서로 선다 */
export const NOTE_KIND_ORDER: NoteKind[] = [NoteKind.MEMO, NoteKind.QUESTION, NoteKind.QUOTE]
