import { useState } from 'react'

/** 새 블록 작성 폼 — 카드 수정 폼과 모양을 맞춘다 */
export default function BlockForm({
  initialTitle = '',
  initialBody = '',
  onSave,
  onCancel,
}: {
  initialTitle?: string
  initialBody?: string
  onSave: (title: string, body: string) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState(initialBody)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim() || !body.trim()) return
        onSave(title.trim(), body.trim())
      }}
      className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4"
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목"
        className="rounded-sm border border-neutral-200 px-3 py-1.5 text-sm font-medium outline-none focus:border-neutral-400"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="내용을 자유롭게 적어보세요"
        className="rounded-sm border border-neutral-200 px-3 py-2 text-sm leading-relaxed outline-none focus:border-neutral-400"
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="app-button app-button-ghost">
          취소
        </button>
        <button type="submit" className="app-button app-button-primary">
          저장
        </button>
      </div>
    </form>
  )
}
