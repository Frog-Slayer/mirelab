import { useEffect } from 'react'
import SlotField from '@/components/slots/SlotField'
import type { SlotDef, SlotValue } from '@/types'
import { Visibility } from '@/types'

/**
 * 내 기록을 담는 자리 — 내 서재와 값이 같은 편집 공간이라 이 페이지에서는
 * 크게 차지하지 않는다. 좁은 화면에서는 왼쪽에서 겹쳐 뜨는 서랍이고,
 * 화면이 넓을 때(xl 이상)는 본문 옆에 자리를 차지하며 밀어내는 사이드바가 된다.
 *
 * RootLayout 이 내준 자리(헤더 아래, main 옆)에 포털로 그린다 — 뷰포트 기준
 * fixed 가 아니라 문서 흐름 안에 실제로 있는 자리라서, 헤더 위로 올라가거나
 * 겹치는 일이 구조적으로 없다.
 */
export default function MyRecordDrawer({
  open,
  summarySlot,
  otherSlots,
  myValueOf,
  onSaveSlot,
  onToggle,
}: {
  open: boolean
  summarySlot?: SlotDef
  otherSlots: SlotDef[]
  myValueOf: (slotId: string) => SlotValue | undefined
  onSaveSlot: (slotDefId: string, value: SlotValue['value']) => void
  onToggle: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open && e.key === 'Escape') onToggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onToggle])

  const allSlots = summarySlot ? [summarySlot, ...otherSlots] : otherSlots

  return (
    <div
      className={`fixed top-[var(--header-h)] bottom-0 left-0 z-40 flex-none overflow-visible transition-[width] duration-150 ease-out motion-reduce:transition-none ${
        open ? 'w-[min(28rem,100vw)]' : 'w-0'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? '내 기록 닫기' : '내 기록 열기'}
        className="absolute inset-y-0 -right-6 z-10 flex w-6 cursor-pointer items-center justify-center rounded-r-2xl border border-l-0 border-neutral-200 bg-white text-neutral-400 shadow-lg transition-colors hover:bg-emerald-50 hover:text-emerald-700"
      >
        <span aria-hidden>{open ? '‹' : '›'}</span>
      </button>

      <aside
        className={`h-full overflow-hidden border border-l-0 border-neutral-200 bg-white shadow-xl transition-[width] duration-150 ease-out motion-reduce:transition-none ${
          open ? 'w-[min(28rem,100vw)]' : 'w-0'
        }`}
      >
        <div className="flex h-full w-[min(28rem,100vw)] flex-col">
          <div className="flex flex-none flex-col border-b border-neutral-200 bg-white px-5 py-3">
            <span className="font-mono text-[10px] tracking-[0.13em] text-neutral-400 uppercase">
              나만
            </span>
            <span className="text-sm font-medium">내 기록</span>
          </div>

          <div className="flex flex-col gap-6 overflow-y-auto overscroll-contain p-5">
            {allSlots.map((slot) => (
              <div
                key={slot.id}
                className="flex flex-col gap-2 border-t border-neutral-100 pt-5 first:border-0 first:pt-0"
              >
                <span className="text-sm font-semibold">
                  {slot.name}
                  {slot.visibility === Visibility.PRIVATE && ' · 🔒 나만'}
                </span>
                <SlotField
                  slot={slot}
                  value={myValueOf(slot.id)?.value}
                  onSave={(value) => onSaveSlot(slot.id, value)}
                />
              </div>
            ))}
            {allSlots.length === 0 && (
              <p className="text-sm text-neutral-400">아직 작성할 수 있는 기록 항목이 없습니다.</p>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
