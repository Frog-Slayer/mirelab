import { useState } from 'react'

/**
 * 새 블록 만들기 — 제목만 받는다. 본문은 Yjs 공유 문서라 만들자마자 바로
 * 다같이 이어 쓰는 빈 에디터로 시작한다(CollaborativeBody 참고).
 */
export default function BlockForm({
  onSave,
  onCancel,
}: {
  onSave: (title: string) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return
        onSave(title.trim())
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
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="app-button app-button-ghost">
          취소
        </button>
        <button type="submit" className="app-button app-button-primary">
          만들기
        </button>
      </div>
    </form>
  )
}
