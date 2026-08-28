import { useEffect, useRef, useState } from 'react'
import BookLookupField from '@/components/BookLookupField'
import WorkPreviewCard from '@/components/WorkPreviewCard'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import { parseYearFromPubDate } from '@/lib/bookApi'
import type { WorkStatus } from '@/types'
import { WorkKind, WorkStatus as WorkStatusValues } from '@/types'

export default function ManageDialog({
  kind,
  title,
  author,
  description,
  coverUrl,
  year,
  status,
  onSaveInfo,
  onChangeStatus,
  onDelete,
  onClose,
}: {
  kind: WorkKind
  title: string
  author: string
  description: string
  coverUrl: string
  year: number
  status: WorkStatus
  onSaveInfo: (info: {
    title: string
    author: string
    description?: string
    coverUrl?: string
    year?: number
  }) => void
  onChangeStatus: (next: WorkStatus) => void
  onDelete: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [draftTitle, setDraftTitle] = useState(title)
  const [draftAuthor, setDraftAuthor] = useState(author)
  const [draftDescription, setDraftDescription] = useState(description)
  const [draftCoverUrl, setDraftCoverUrl] = useState(coverUrl)
  const [draftYear, setDraftYear] = useState<number | undefined>(year)
  const [next, setNext] = useState<WorkStatus>(status)
  const [confirmText, setConfirmText] = useState('')
  const requiredPhrase = `${title} 절대 안 읽을 거임!!`

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
      className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-2xl p-0 shadow-xl ring-1 ring-neutral-950/10 backdrop:bg-neutral-900/40 backdrop:backdrop-blur-sm"
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
          <span className="text-xs font-medium text-neutral-500">정보 수정</span>
          <WorkPreviewCard
            kind={kind}
            title={draftTitle}
            onTitleChange={setDraftTitle}
            author={draftAuthor}
            onAuthorChange={setDraftAuthor}
            year={draftYear}
            onYearChange={setDraftYear}
            description={draftDescription}
            onDescriptionChange={setDraftDescription}
            coverUrl={draftCoverUrl}
            onClearCover={() => setDraftCoverUrl('')}
          />
          {kind === WorkKind.BOOK && (
            <BookLookupField
              kind={kind}
              title={draftTitle}
              coverUrl={draftCoverUrl}
              onPick={(book) => {
                setDraftTitle(book.title)
                setDraftAuthor(book.author)
                setDraftCoverUrl(book.cover)
                setDraftDescription(book.description)
                const pickedYear = parseYearFromPubDate(book.pubDate)
                if (pickedYear) setDraftYear(pickedYear)
              }}
            />
          )}
          <button
            type="button"
            disabled={!draftTitle.trim()}
            onClick={() => {
              onSaveInfo({
                title: draftTitle.trim(),
                author: draftAuthor.trim(),
                description: draftDescription || undefined,
                coverUrl: draftCoverUrl || undefined,
                // 연도 입력을 지운 채로 저장하면 원래 값을 유지한다 — 값 자체가 없어지면 안 된다
                year: draftYear ?? year,
              })
              ref.current?.close()
            }}
            className="app-button app-button-primary self-end"
          >
            정보 저장
          </button>
        </div>

        <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4">
          <span className="text-xs font-medium text-neutral-500">상태</span>
          <div className="flex gap-2">
            <select
              value={next}
              onChange={(e) => setNext(e.target.value as WorkStatus)}
              className="app-input flex-1 cursor-pointer"
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
          <p className="text-xs text-neutral-500">
            계속하려면 아래에 <span className="font-medium text-neutral-700">{requiredPhrase}</span>{' '}
            를 정확히 입력하세요.
          </p>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={requiredPhrase}
            className="app-input"
          />
          <button
            type="button"
            disabled={confirmText !== requiredPhrase}
            onClick={() => {
              onDelete()
              ref.current?.close()
            }}
            className="app-button app-button-danger self-start"
          >
            영구 삭제
          </button>
        </div>
      </div>
    </dialog>
  )
}
