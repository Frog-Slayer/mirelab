import Stars from '@/components/Stars'
import { useDebouncedSave } from '@/hooks/useDebouncedSave'
import type { SlotDef, SlotValueData } from '@/types'
import { SlotType } from '@/types'

interface Props {
  slot: SlotDef
  value?: SlotValueData
  readOnly?: boolean
  /** 약속(Promise)을 돌려주면 저장들이 순서대로 나간다 — [useDebouncedSave] */
  onSave: (value: SlotValueData) => void | Promise<unknown>
}

// 칸 타입 → 렌더러. 새 타입을 늘리려면 여기 한 줄과 컴포넌트 하나만 추가하면 된다.
export default function SlotField({ slot, value, readOnly = false, onSave }: Props) {
  switch (slot.type) {
    case SlotType.RATING:
      return <RatingField value={value} readOnly={readOnly} onSave={onSave} />
    case SlotType.TEXT_SHORT:
      return <TextField value={value} readOnly={readOnly} onSave={onSave} multiline={false} />
    case SlotType.TEXT_LONG:
      return <TextField value={value} readOnly={readOnly} onSave={onSave} multiline />
    case SlotType.LIST:
      return <ListField value={value} readOnly={readOnly} onSave={onSave} />
    default:
      return null
  }
}

function RatingField({ value, readOnly, onSave }: Omit<Props, 'slot'>) {
  const n = value && 'n' in value ? value.n : 0
  if (readOnly) return n ? <Stars value={n} /> : <Empty />
  return <Stars value={n} size="lg" onChange={(next) => onSave({ n: next })} />
}

function TextField({
  value,
  readOnly,
  onSave,
  multiline,
}: Omit<Props, 'slot'> & { multiline: boolean }) {
  const initial = value && 'text' in value ? value.text : ''
  const [text, setText] = useDebouncedSave(initial, (next) => onSave({ text: next }))

  if (readOnly) return text ? <p className="text-sm whitespace-pre-wrap">{text}</p> : <Empty />

  const shared = 'app-input w-full leading-relaxed'

  return multiline ? (
    <textarea
      value={text}
      onChange={(e) => setText(e.target.value)}
      rows={5}
      placeholder="자유롭게 적어두세요"
      className={`${shared} resize-y`}
    />
  ) : (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      placeholder="한 줄로"
      className={shared}
    />
  )
}

function ListField({ value, readOnly, onSave }: Omit<Props, 'slot'>) {
  const initial = value && 'items' in value ? value.items : []
  const [items, setItems] = useDebouncedSave(initial, (next) => onSave({ items: next }), 400)

  if (readOnly) {
    if (items.length === 0) return <Empty />
    return (
      <ul className="flex flex-col gap-1 text-sm">
        {items.map((item, i) => (
          <li key={i}>· {item}</li>
        ))}
      </ul>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-neutral-400">·</span>
          <input
            value={item}
            onChange={(e) => setItems(items.map((it, j) => (j === i ? e.target.value : it)))}
            className="flex-1 border-0 border-b border-neutral-200 bg-transparent px-1 py-2 text-sm outline-none focus:border-emerald-600"
          />
          <button
            type="button"
            onClick={() => setItems(items.filter((_, j) => j !== i))}
            className="app-button app-button-ghost app-icon-button"
            aria-label="지우기"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setItems([...items, ''])}
        className="app-button app-button-ghost self-start"
      >
        + 추가
      </button>
    </div>
  )
}

function Empty() {
  return <span className="text-sm text-neutral-500">비어 있음</span>
}
