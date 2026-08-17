import { useState } from 'react'
import PickNote from '@/components/PickNote'
import type { User } from '@/types'

/** 선정 이유는 그 책을 담은 사람만 고친다 */
export default function PickBlock({
  addedBy,
  reason,
  users,
  canEdit,
  onSave,
}: {
  addedBy?: string
  reason?: string
  users: User[]
  canEdit: boolean
  onSave: (reason: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(reason ?? '')

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave(text.trim())
          setEditing(false)
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="왜 고르셨나요"
          className="min-w-60 flex-1 rounded-sm border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-neutral-400"
        />
        <button type="submit" className="app-button app-button-primary">
          저장
        </button>
        <button
          type="button"
          onClick={() => {
            setText(reason ?? '')
            setEditing(false)
          }}
          className="app-button app-button-ghost"
        >
          취소
        </button>
      </form>
    )
  }

  return (
    <div className="flex items-start gap-3">
      <PickNote addedBy={addedBy} reason={reason} users={users} size="md" />
      {canEdit && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="whitespace-nowrap text-sm font-medium text-neutral-400 underline decoration-neutral-300 underline-offset-2 transition-colors hover:text-neutral-600 hover:decoration-neutral-500"
        >
          {reason ? '수정' : '이유 적기'}
        </button>
      )}
    </div>
  )
}
