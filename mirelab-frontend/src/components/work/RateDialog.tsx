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
  published,
  onPublishedChange,
  changingPublished,
  publishError,
  onSaveSlot,
  onClose,
}: {
  ratingSlot: SlotDef
  blurbSlot?: SlotDef
  ratingValue?: SlotValue['value']
  blurbValue?: SlotValue['value']
  published: boolean
  onPublishedChange: (published: boolean) => void
  changingPublished?: boolean
  /** 공개 전환이 실패했을 때의 안내 — 버튼이 제자리로 돌아간 이유를 알려준다 */
  publishError?: string | null
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

        <div className="border-t border-neutral-100 pt-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-sm font-semibold">내 평가 공개</span>
              <p className="mt-0.5 text-xs text-neutral-500">
                별점과 한줄평이 함께 열립니다. 공개된 별점만 평균에 반영됩니다.
              </p>
            </div>
            <div className="flex shrink-0 rounded-lg bg-neutral-100 p-1">
              {[false, true].map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => onPublishedChange(value)}
                  disabled={!ratingValue || changingPublished}
                  aria-pressed={published === value}
                  className={`cursor-pointer rounded-md px-2.5 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    published === value
                      ? 'bg-white font-medium text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {value ? '공개' : '비공개'}
                </button>
              ))}
            </div>
          </div>
          {publishError && (
            <p role="alert" className="mt-2 text-xs text-rose-600">
              {publishError}
            </p>
          )}
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
