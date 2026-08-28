import { useEffect, useRef, useState } from 'react'
import Stars from '@/components/Stars'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import type { SlotDef, SlotValue } from '@/types'

/**
 * 멤버별 평점의 내 카드를 누르면 뜬다 — 평점·한줄평·공개 여부를 한 곳에서 입력한다.
 * 값은 로컬에만 두고, 저장을 눌러야 실제로 반영한다 — 훑어서 점수를 매기는 동안
 * 매 순간을 저장하려 들면 요청이 쌓여 저장이 꼬인다.
 */
export default function RateDialog({
  ratingSlot,
  blurbSlot,
  ratingValue,
  blurbValue,
  published,
  publishError,
  onSave,
  onClose,
}: {
  ratingSlot: SlotDef
  blurbSlot?: SlotDef
  ratingValue?: SlotValue['value']
  blurbValue?: SlotValue['value']
  published: boolean
  /** 공개 전환이 실패했을 때의 안내 — 저장이 왜 안 먹혔는지 알려준다 */
  publishError?: string | null
  onSave: (input: { rating?: number; blurb?: string; published?: boolean }) => Promise<void>
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
  }, [])
  useLockBodyScroll()

  const initialRating = ratingValue && 'n' in ratingValue ? ratingValue.n : 0
  const initialBlurb = blurbValue && 'text' in blurbValue ? blurbValue.text : ''
  const [rating, setRating] = useState(initialRating)
  const [blurb, setBlurb] = useState(initialBlurb)
  const [publishedLocal, setPublishedLocal] = useState(published)
  const [submitting, setSubmitting] = useState(false)

  const dirtyRating = rating !== initialRating
  const dirtyBlurb = blurb !== initialBlurb
  const dirtyPublished = publishedLocal !== published
  const dirty = dirtyRating || dirtyBlurb || dirtyPublished

  const save = async () => {
    if (!dirty) {
      ref.current?.close()
      return
    }
    setSubmitting(true)
    try {
      await onSave({
        rating: dirtyRating ? rating : undefined,
        blurb: dirtyBlurb ? blurb : undefined,
        published: dirtyPublished ? publishedLocal : undefined,
      })
      ref.current?.close()
    } catch {
      // 실패한 이유는 publishError 로 올라온다 — 다이얼로그를 열어둔 채 다시 시도하게 둔다
    } finally {
      setSubmitting(false)
    }
  }

  const cancel = () => {
    setRating(initialRating)
    setBlurb(initialBlurb)
    setPublishedLocal(published)
    ref.current?.close()
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) cancel()
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl p-0 shadow-xl ring-1 ring-neutral-950/10 backdrop:bg-neutral-900/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-base font-semibold">내 평가</h2>
          <button
            type="button"
            onClick={cancel}
            className="app-button app-button-ghost app-icon-button"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-semibold">{ratingSlot.name}</span>
          <Stars value={rating} size="lg" onChange={setRating} />
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
                  onClick={() => setPublishedLocal(value)}
                  disabled={rating <= 0 || submitting}
                  aria-pressed={publishedLocal === value}
                  className={`cursor-pointer rounded-md px-2.5 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    publishedLocal === value
                      ? 'bg-white font-medium text-neutral-900 ring-1 ring-neutral-950/[0.06]'
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
            <input
              value={blurb}
              onChange={(e) => setBlurb(e.target.value)}
              placeholder="한 줄로"
              className="app-input w-full leading-relaxed"
            />
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
          <button
            type="button"
            onClick={cancel}
            disabled={submitting}
            className="app-button app-button-ghost"
          >
            취소
          </button>
          <button
            type="button"
            onClick={save}
            disabled={submitting}
            className="app-button app-button-primary"
          >
            {submitting ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
