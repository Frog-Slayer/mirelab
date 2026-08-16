import { useState } from 'react'
import { useDebouncedSave } from '@/hooks/useDebouncedSave'
import type { Memo, SharedItem, SlotDef, SlotValueData, User } from '@/types'

interface Props {
  slot: SlotDef
  value?: SlotValueData
  memos: Memo[]
  users: User[]
  currentUserId: string
  onSave: (value: SlotValueData) => void
  onAddMemo: (input: { itemId: string; text: string; isPrivate: boolean }) => void
  onRemoveMemo: (memoId: string) => void
}

let itemSeq = 1000

/**
 * 공동 칸. 항목 목록이고, 각 항목에 개인 메모가 붙는다.
 * 공동 문서는 합의된 내용, 메모는 각자 관점 — 섞으면 둘 다 망가진다.
 *
 * 지금은 로컬 상태로만 동작한다. 나중에 항목 본문은 Yjs 가 소유하고
 * 메모는 DB 가 소유하며, 항목 id 로 연결된다.
 */
export default function SharedItemsField({
  slot,
  value,
  memos,
  users,
  currentUserId,
  onSave,
  onAddMemo,
  onRemoveMemo,
}: Props) {
  const initial = value && 'shared' in value ? value.shared : []
  const [items, setItems] = useDebouncedSave<SharedItem[]>(
    initial,
    (next) => onSave({ shared: next }),
    500,
  )
  const [memoFor, setMemoFor] = useState<string | null>(null)

  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? '?'

  return (
    <div className="flex flex-col gap-4">
      {items.map((item, i) => {
        const itemMemos = memos.filter(
          (m) => m.itemId === item.id && (!m.isPrivate || m.userId === currentUserId),
        )
        return (
          <div key={item.id} className="flex flex-col gap-1.5">
            <div className="flex items-start gap-2">
              <span className="pt-2 text-xs text-neutral-400 tabular-nums">{i + 1}.</span>
              <textarea
                value={item.text}
                rows={1}
                onChange={(e) =>
                  setItems(
                    items.map((it) => (it.id === item.id ? { ...it, text: e.target.value } : it)),
                  )
                }
                className="field-sizing-content flex-1 resize-none border-0 border-b border-transparent bg-transparent px-2 py-1.5 text-sm leading-relaxed outline-none hover:border-neutral-200 focus:border-emerald-600"
              />
              <button
                type="button"
                onClick={() => setItems(items.filter((it) => it.id !== item.id))}
                className="app-button app-button-ghost app-icon-button text-neutral-300"
                aria-label="항목 지우기"
              >
                ✕
              </button>
            </div>

            {itemMemos.map((memo) => (
              <div
                key={memo.id}
                className="group ml-8 flex items-baseline gap-2 border-l-2 border-neutral-200 py-1 pl-3 text-sm"
              >
                <span
                  className={
                    memo.isPrivate ? 'flex-none text-neutral-400' : 'flex-none text-emerald-700'
                  }
                >
                  {memo.isPrivate ? '🔒' : ''} {nameOf(memo.userId)}
                </span>
                <span className="flex-1 text-neutral-600">{memo.text}</span>
                {memo.userId === currentUserId && (
                  <button
                    type="button"
                    onClick={() => onRemoveMemo(memo.id)}
                    className="app-button app-button-ghost app-icon-button text-neutral-300 opacity-0 group-hover:opacity-100"
                    aria-label="메모 지우기"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {slot.allowMemo &&
              (memoFor === item.id ? (
                <MemoForm
                  onCancel={() => setMemoFor(null)}
                  onSubmit={(text, isPrivate) => {
                    onAddMemo({ itemId: item.id, text, isPrivate })
                    setMemoFor(null)
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setMemoFor(item.id)}
                  className="app-button app-button-ghost ml-8 self-start"
                >
                  💬 메모
                </button>
              ))}
          </div>
        )
      })}

      <button
        type="button"
        onClick={() => setItems([...items, { id: `i${itemSeq++}`, text: '' }])}
        className="app-button app-button-ghost self-start"
      >
        + 항목
      </button>
    </div>
  )
}

function MemoForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (text: string, isPrivate: boolean) => void
  onCancel: () => void
}) {
  const [text, setText] = useState('')
  const [isPrivate, setPrivate] = useState(false)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (text.trim()) onSubmit(text.trim(), isPrivate)
      }}
      className="ml-8 flex flex-wrap items-center gap-2 border-l-2 border-emerald-200 pl-3"
    >
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="이 항목에 대한 내 생각"
        className="min-w-40 flex-1 rounded-sm border border-neutral-200 px-2 py-1 text-xs outline-none focus:border-neutral-400"
      />
      <label className="flex items-center gap-1 text-xs text-neutral-500">
        <input type="checkbox" checked={isPrivate} onChange={(e) => setPrivate(e.target.checked)} />
        비공개
      </label>
      <button type="submit" className="app-button app-button-primary min-h-8 px-3">
        남기기
      </button>
      <button type="button" onClick={onCancel} className="app-button app-button-ghost">
        취소
      </button>
    </form>
  )
}
