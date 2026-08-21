import { useEffect, useRef } from 'react'
import SlotField from '@/components/slots/SlotField'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import type { SlotDef, SlotValue } from '@/types'

/** 멤버별 평점의 내 카드를 누르면 뜬다 — 평점·한줄평을 한 곳에서 입력한다 */
export default function RateDialog({
  ratingSlot,
  blurbSlot,
  ratingValue,
  blurbValue,
  onSaveSlot,
  onClose,
}: {
  ratingSlot: SlotDef
  blurbSlot?: SlotDef
  ratingValue?: SlotValue['value']
  blurbValue?: SlotValue['value']
  onSaveSlot: (slotDefId: string, value: SlotValue['value']) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
  }, [])
  useLockBodyScroll()

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close()
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-sm border border-neutral-200 p-0 backdrop:bg-neutral-900/30"
    >
      <div className="flex flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-base font-semibold">내 평가</h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="app-button app-button-ghost app-icon-button"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-semibold">{ratingSlot.name}</span>
          <SlotField
            slot={ratingSlot}
            value={ratingValue}
            onSave={(value) => onSaveSlot(ratingSlot.id, value)}
          />
        </div>

        {blurbSlot && (
          <div className="flex flex-col gap-2 border-t border-neutral-100 pt-4">
            <span className="text-sm font-semibold">{blurbSlot.name}</span>
            <SlotField
              slot={blurbSlot}
              value={blurbValue}
              onSave={(value) => onSaveSlot(blurbSlot.id, value)}
            />
          </div>
        )}
      </div>
    </dialog>
  )
}
