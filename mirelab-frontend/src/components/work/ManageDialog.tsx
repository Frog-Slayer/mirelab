import { useEffect, useRef, useState } from 'react'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import type { WorkStatus } from '@/types'
import { WorkStatus as WorkStatusValues } from '@/types'

export default function ManageDialog({
  title,
  status,
  deletable,
  lockReason,
  onChangeStatus,
  onDelete,
  onClose,
}: {
  title: string
  status: WorkStatus
  deletable: boolean
  lockReason: string
  onChangeStatus: (next: WorkStatus) => void
  onDelete: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [next, setNext] = useState<WorkStatus>(status)
  const [confirming, setConfirming] = useState(false)

  // <dialog> 를 쓰면 Esc 와 포커스 가둠을 브라우저가 해준다
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
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-sm border border-neutral-200 p-0 backdrop:bg-neutral-900/30"
    >
      <div className="flex flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="app-button app-button-ghost app-icon-button"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-neutral-500">상태</span>
          <div className="flex gap-2">
            <select
              value={next}
              onChange={(e) => setNext(e.target.value as WorkStatus)}
              className="flex-1 cursor-pointer rounded-sm border border-neutral-200 px-3 py-2 text-sm"
            >
              <option value={WorkStatusValues.CANDIDATE}>후보</option>
              <option value={WorkStatusValues.READING}>읽는 중</option>
              <option value={WorkStatusValues.DONE}>완료</option>
            </select>
            <button
              type="button"
              disabled={next === status}
              onClick={() => {
                onChangeStatus(next)
                ref.current?.close()
              }}
              className="app-button app-button-primary"
            >
              바꾸기
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4">
          <span className="text-xs font-medium text-neutral-500">삭제</span>

          {!deletable ? (
            <p className="text-xs text-neutral-500">{lockReason}.</p>
          ) : confirming ? (
            <div className="flex items-center gap-2">
              <span className="flex-1 text-xs text-neutral-600">정말 지울까요?</span>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="app-button app-button-secondary"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete()
                  ref.current?.close()
                }}
                className="app-button app-button-danger"
              >
                지우기
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="app-button app-button-secondary self-start hover:text-rose-700"
            >
              작품에서 지우기
            </button>
          )}
        </div>
      </div>
    </dialog>
  )
}
