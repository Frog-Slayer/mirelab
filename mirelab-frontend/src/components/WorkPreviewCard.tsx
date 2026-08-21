import { useEffect, useRef } from 'react'
import Cover from '@/components/Cover'
import { WorkKind } from '@/types'

/**
 * 작품 상세(WorkPage) 헤더를 축소한 미리보기 카드 — 제목·저자·줄거리를 그 자리에서
 * 바로 고칠 수 있다. "판본 찾기"로 채워진 값도, 손으로 입력한 값도 여기서 동등하게 편집된다.
 */
export default function WorkPreviewCard({
  kind,
  title,
  onTitleChange,
  author,
  onAuthorChange,
  description,
  onDescriptionChange,
  coverUrl,
  onClearCover,
  reason,
  onReasonChange,
}: {
  kind: WorkKind
  title: string
  onTitleChange: (value: string) => void
  author: string
  onAuthorChange: (value: string) => void
  description: string
  onDescriptionChange: (value: string) => void
  coverUrl: string
  onClearCover: () => void
  /** 선정 이유 — 스터디 후보 등록에서만 쓴다. WorkPage 의 PickBlock 자리와 동일한 위치 */
  reason?: string
  onReasonChange?: (value: string) => void
}) {
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const reasonRef = useRef<HTMLTextAreaElement>(null)

  // 스크롤 없이 항상 전체가 다 보이도록, 내용 길이에 맞춰 높이를 늘린다(옆으로 안 밀리고 아래로 늘어난다).
  useEffect(() => {
    const el = descriptionRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [description])

  useEffect(() => {
    const el = reasonRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [reason])

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex gap-6">
        <div className="flex w-40 flex-none flex-col justify-center sm:w-48">
          <div className="relative">
            <Cover work={{ title, kind, coverUrl }} size="lg" />
            {coverUrl && (
              <button
                type="button"
                onClick={onClearCover}
                className="absolute -top-1.5 -right-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-neutral-900 text-xs text-white"
                aria-label="선택한 표지 지우기"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 pt-0.5">
          <span className="text-xs font-medium text-neutral-400">
            {kind === WorkKind.MOVIE ? 'Movie' : 'Book'}
          </span>
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="제목"
            className="w-full rounded-sm border-none bg-transparent px-0 text-3xl leading-tight font-semibold tracking-[-0.03em] outline-none placeholder:text-neutral-300 sm:text-4xl"
          />
          <input
            value={author}
            onChange={(e) => onAuthorChange(e.target.value)}
            placeholder={kind === WorkKind.MOVIE ? '감독' : '저자'}
            className="w-full rounded-sm border-none bg-transparent px-0 text-base text-neutral-500 outline-none placeholder:text-neutral-300"
          />
          <textarea
            ref={descriptionRef}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="줄거리"
            rows={1}
            className="w-full max-w-xl resize-none overflow-hidden rounded-sm border-none bg-transparent px-0 text-sm leading-relaxed text-neutral-600 outline-none placeholder:text-neutral-300"
          />
          {onReasonChange && (
            <div className="mt-auto pt-2">
              <textarea
                ref={reasonRef}
                value={reason ?? ''}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder="왜 고르셨나요 — 작품 기록에 함께 남습니다"
                rows={1}
                className="w-full max-w-xl resize-none overflow-hidden rounded-sm border-none bg-transparent px-0 text-sm text-neutral-500 outline-none placeholder:text-neutral-300"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
