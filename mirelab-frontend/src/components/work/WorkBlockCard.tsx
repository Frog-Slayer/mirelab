import { useState } from 'react'
import CollaborativeBody from '@/components/work/CollaborativeBody'
import { formatDate } from '@/lib/format'
import type { User, WorkBlock } from '@/types'

/**
 * 함께 쓰는 블록 하나. 제목은 쓴 사람만 고치거나 지울 수 있고, 본문은 다같이
 * 실시간으로 이어 쓰는 Yjs 공유 문서라 따로 "수정" 모드가 없다 — 늘 열려 있다.
 */
export default function WorkBlockCard({
  block,
  author,
  currentUser,
  canEdit,
  onSaveTitle,
  onDelete,
}: {
  block: WorkBlock
  author?: User
  currentUser: User
  canEdit: boolean
  onSaveTitle: (title: string) => void
  onDelete: () => void
}) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [title, setTitle] = useState(block.title)

  return (
    <article className="flex flex-col rounded-xl border border-neutral-200 bg-white px-5 py-5">
      <div className="flex items-start justify-between gap-4 px-4 sm:px-[54px]">
        {editingTitle ? (
          <form
            className="flex min-w-0 flex-1 items-start gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (!title.trim()) return
              onSaveTitle(title.trim())
              setEditingTitle(false)
            }}
          >
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="work-block-h1 min-w-0 flex-1 border-b border-transparent bg-transparent px-0 pb-1 outline-none placeholder:text-neutral-300 focus:border-neutral-300"
            />
            <button type="submit" className="app-button app-button-primary">
              저장
            </button>
            <button
              type="button"
              onClick={() => {
                setTitle(block.title)
                setEditingTitle(false)
              }}
              className="app-button app-button-ghost"
            >
              취소
            </button>
          </form>
        ) : (
          <>
            <h2 className="work-block-h1">
              {block.title}
            </h2>
            {canEdit &&
              (confirming ? (
                <div className="flex flex-none items-center gap-2 text-xs">
                  <span className="text-neutral-500">정말 지울까요?</span>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="app-button app-button-secondary"
                  >
                    취소
                  </button>
                  <button type="button" onClick={onDelete} className="app-button app-button-danger">
                    지우기
                  </button>
                </div>
              ) : (
                <div className="flex flex-none gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setEditingTitle(true)}
                    className="text-neutral-400 underline decoration-neutral-300 underline-offset-2 transition-colors hover:text-neutral-600 hover:decoration-neutral-500"
                  >
                    제목 수정
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    className="text-neutral-400 underline decoration-neutral-300 underline-offset-2 transition-colors hover:text-rose-600 hover:decoration-rose-400"
                  >
                    삭제
                  </button>
                </div>
              ))}
          </>
        )}
      </div>

      <div className="mt-3 min-h-24">
        <CollaborativeBody blockId={block.id} user={currentUser} />
      </div>

      <div className="mt-3 flex items-center gap-1.5 border-t border-neutral-100 px-4 pt-3 text-xs text-neutral-400 sm:px-[54px]">
        {author && <span className={`size-1.5 rounded-full ${author.color}`} aria-hidden />}
        <span>{author?.name ?? '알 수 없음'}</span>
        <span aria-hidden>·</span>
        <span>{formatDate(block.createdAt)}</span>
      </div>
    </article>
  )
}
