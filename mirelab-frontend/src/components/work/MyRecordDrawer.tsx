import { useEffect, type ReactNode } from 'react'
import { Check, ChevronLeft, Lock, LoaderCircle, NotebookPen, TriangleAlert, X } from 'lucide-react'
import PersonalNoteField from '@/components/slots/PersonalNoteField'
import SlotField from '@/components/slots/SlotField'
import type { SlotDef, SlotValue } from '@/types'
import { Visibility } from '@/types'

/**
 * 펼쳤을 때의 폭. 세 군데(자리를 잡는 겉, 폭이 줄었다 늘었다 하는 aside, 그 안에서 폭이
 * 고정돼야 하는 내용)가 같은 값을 써야 해서 한 곳에만 적어 둔다 — 하나만 어긋나면 여닫는
 * 동안 글이 접혔다 펴진다.
 *
 * RootLayout 이 <main> 옆에 비워 두는 자리(xl:w-[28rem])와도 같은 값이어야 한다. 거기는
 * Tailwind 가 클래스를 미리 뽑아내야 해서 변수로 못 넘긴다 — 고칠 때 같이 고칠 것.
 */
const WIDTH = 'w-[min(28rem,100vw)]'
const SLIDE = 'transition-[width] duration-150 ease-out motion-reduce:transition-none'

/** 자동저장이 지금 어디까지 왔는지. 'idle' 은 아직 아무것도 안 쳤을 때 */
export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/**
 * 내 메모을 담는 자리 — 내 서재와 값이 같은 편집 공간이라 이 페이지에서는
 * 크게 차지하지 않는다. 좁은 화면에서는 왼쪽에서 겹쳐 뜨는 서랍이고,
 * 화면이 넓을 때(xl 이상)는 본문 옆에 자리를 차지하며 밀어내는 사이드바가 된다.
 *
 * RootLayout 이 내준 자리(헤더 아래, main 옆)에 그린다 — 뷰포트 기준 fixed 지만 위쪽을
 * --header-h 로 잘라서, 헤더 위로 올라가거나 겹치는 일이 구조적으로 없다.
 */
export default function MyRecordDrawer({
  open,
  summarySlot,
  otherSlots,
  myValueOf,
  draftKeyPrefix,
  saveState,
  onSaveSlot,
  onToggle,
}: {
  open: boolean
  summarySlot?: SlotDef
  otherSlots: SlotDef[]
  myValueOf: (slotId: string) => SlotValue | undefined
  /** 아직 못 보낸 글을 브라우저에 맡길 때 쓰는 이름표의 앞부분(작품·사람) */
  draftKeyPrefix: string
  saveState: SaveState
  /** 저장이 끝나는 때를 알 수 있게 약속(Promise)을 돌려주면, 저장들이 순서대로 나간다 */
  onSaveSlot: (slotDefId: string, value: SlotValue['value']) => void | Promise<unknown>
  onToggle: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open && e.key === 'Escape') onToggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onToggle])

  const width = open ? WIDTH : 'w-0'

  return (
    <>
      {/*
        xl 미만에서는 서랍이 본문 위를 덮는다. 그때는 덮인 곳을 눌러서 닫을 수 있어야 한다 —
        안 그러면 손잡이를 다시 찾아 누르는 수밖에 없다. xl 이상에서는 본문을 밀어내고 나란히
        서므로 덮개가 필요 없다(있으면 읽고 있던 본문이 괜히 어두워진다).
      */}
      {open && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={onToggle}
          className="fixed inset-x-0 top-[var(--header-h)] bottom-0 z-30 cursor-default bg-neutral-950/20 xl:hidden"
        />
      )}

      <div
        className={`fixed top-[var(--header-h)] bottom-0 left-0 z-40 flex-none overflow-visible ${SLIDE} ${width}`}
      >
        {/*
          손잡이. 예전에는 서랍 오른쪽 모서리를 위아래로 가로지르는 24px 짜리 띠였는데,
          닫혀 있을 때는 화면 왼쪽 끝에 붙은 긴 막대로만 보여서 무엇에 딸린 것인지 알 수
          없었다. 세로 가운데의 작은 탭으로 줄이고, 닫혀 있을 때만 이름을 세로로 적는다.
        */}
        <button
          type="button"
          onClick={onToggle}
          aria-label={open ? '내 메모 닫기' : '내 메모 열기'}
          className="absolute top-1/2 -right-8 z-10 flex w-8 -translate-y-1/2 cursor-pointer flex-col items-center gap-2 rounded-r-xl bg-white py-4 text-neutral-500 shadow-[3px_0_10px_rgb(15_23_42/0.07)] ring-1 ring-neutral-950/[0.07] transition-colors hover:bg-emerald-50 hover:text-emerald-700"
        >
          {open ? (
            <ChevronLeft aria-hidden className="size-4" strokeWidth={2} />
          ) : (
            <>
              <NotebookPen aria-hidden className="size-4" strokeWidth={1.75} />
              {/* 폭이 32px 뿐이라 가로로는 두 글자도 못 넣는다 — 글줄을 세로로 세운다 */}
              <span
                aria-hidden
                className="text-xs font-medium [writing-mode:vertical-rl] whitespace-nowrap"
              >
                내 메모
              </span>
            </>
          )}
        </button>

        <aside
          className={`h-full overflow-hidden rounded-r-2xl bg-white shadow-[4px_0_24px_rgb(15_23_42/0.08)] ring-1 ring-neutral-950/[0.07] ${SLIDE} ${width}`}
        >
          {/* 여닫히는 동안 안쪽 폭은 고정 — 안 그러면 글이 접혔다 펴지는 게 보인다 */}
          <div className={`flex h-full flex-col ${WIDTH}`}>
            <div className="flex flex-none items-center gap-2 border-b border-neutral-100 px-5 py-3">
              <NotebookPen aria-hidden className="size-4 text-neutral-400" strokeWidth={1.75} />
              <h2 className="text-sm font-medium">내 메모</h2>
              <SaveBadge state={saveState} />
              <button
                type="button"
                onClick={onToggle}
                aria-label="내 메모 닫기"
                className="app-button app-button-ghost app-icon-button ml-auto text-neutral-400"
              >
                <X aria-hidden className="size-4" strokeWidth={2} />
              </button>
            </div>

            <div className="flex flex-col gap-6 overflow-y-auto overscroll-contain p-5">
              {summarySlot && (
                <Field slot={summarySlot}>
                  <PersonalNoteField
                    value={myValueOf(summarySlot.id)?.value}
                    draftKey={`${draftKeyPrefix}:${summarySlot.id}`}
                    onSave={(value) => onSaveSlot(summarySlot.id, value)}
                  />
                </Field>
              )}

              {otherSlots.map((slot) => (
                <Field key={slot.id} slot={slot}>
                  <SlotField
                    slot={slot}
                    value={myValueOf(slot.id)?.value}
                    onSave={(value) => onSaveSlot(slot.id, value)}
                  />
                </Field>
              ))}

              {!summarySlot && otherSlots.length === 0 && (
                <p className="text-sm text-neutral-500">
                  아직 작성할 수 있는 기록 항목이 없습니다.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}

/**
 * 저장 버튼이 없는 자리라, 지금 무슨 일이 벌어지는지는 여기서만 알 수 있다. 실패는 색으로도
 * 알린다 — 나머지 둘은 지나가는 소식이지만 이건 사람이 손을 써야 하는 소식이다.
 *
 * aria-live 로 두는 이유: 눈으로 보고 있지 않아도(에디터에 초점이 가 있다) 저장 실패는
 * 전해져야 한다.
 */
function SaveBadge({ state }: { state: SaveState }) {
  if (state === 'idle') return null

  const { Icon, label, tone, spin } = {
    saving: { Icon: LoaderCircle, label: '저장 중', tone: 'text-neutral-400', spin: true },
    saved: { Icon: Check, label: '저장됨', tone: 'text-neutral-400', spin: false },
    error: { Icon: TriangleAlert, label: '저장 실패', tone: 'text-rose-600', spin: false },
  }[state]

  return (
    <span aria-live="polite" className={`flex items-center gap-1 text-xs ${tone}`}>
      <Icon
        aria-hidden
        className={`size-3.5 ${spin ? 'animate-spin motion-reduce:animate-none' : ''}`}
        strokeWidth={2}
      />
      {label}
    </span>
  )
}

/**
 * 기록 항목 하나. 서랍 전체에 "나만 봅니다" 를 붙이지 않는 이유: 여기 오는 칸이 다 비공개는
 * 아니다(개인 칸이어도 스터디에 보이는 것이 있다). 자물쇠는 실제로 비공개인 칸에만 붙는다.
 */
function Field({ slot, children }: { slot: SlotDef; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t border-neutral-100 pt-5 first:border-0 first:pt-0">
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        {slot.name}
        {slot.visibility === Visibility.PRIVATE && (
          <Lock aria-label="나만 봅니다" className="size-3 flex-none text-neutral-400" />
        )}
      </span>
      {children}
    </div>
  )
}
