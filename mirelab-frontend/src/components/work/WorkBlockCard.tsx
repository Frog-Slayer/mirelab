import { useState } from 'react'
import BlockForm from '@/components/work/BlockForm'
import { formatDate } from '@/lib/format'
import type { User, WorkBlock } from '@/types'

/** 함께 쓰는 블록 하나. 쓴 사람만 고치거나 지울 수 있다 */
export default function WorkBlockCard({
  block,
  author,
  canEdit,
  onSave,
  onDelete,
}: {
  block: WorkBlock
  author?: User
  canEdit: boolean
  onSave: (title: string, body: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  if (editing) {
    return (
      <BlockForm
        initialTitle={block.title}
        initialBody={block.body}
        onSave={(title, body) => {
          onSave(title, body)
          setEditing(false)
        }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-sm font-semibold">{block.title}</h3>
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
                onClick={() => setEditing(true)}
                className="text-neutral-400 underline decoration-neutral-300 underline-offset-2 transition-colors hover:text-neutral-600 hover:decoration-neutral-500"
              >
                수정
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
      </div>
      <p className="whitespace-pre-wrap text-sm text-neutral-600">{block.body}</p>
      <div className="flex items-center gap-1.5 text-xs text-neutral-400">
        {author && <span className={`size-1.5 rounded-full ${author.color}`} aria-hidden />}
        <span>{author?.name ?? '알 수 없음'}</span>
        <span aria-hidden>·</span>
        <span>{formatDate(block.createdAt)}</span>
      </div>
    </div>
  )
}
