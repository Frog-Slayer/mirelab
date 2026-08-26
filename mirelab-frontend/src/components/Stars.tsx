import { useRef, useState } from 'react'

interface Props {
  value: number
  /** 주면 점수를 매길 수 있다. 0.1 단위 */
  onChange?: (next: number) => void
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 'text-xs gap-px', md: 'text-base gap-0.5', lg: 'text-2xl gap-1' }

const snap = (n: number) => Math.round(Math.min(Math.max(n, 0), 5) * 10) / 10

export default function Stars({ value, onChange, size = 'md' }: Props) {
  if (onChange) return <StarInput value={value} onChange={onChange} size={size} />
  return <StarDisplay value={value} size={size} />
}

// 평균은 4.33 처럼 어중간하게 나온다. 반올림해서 보여주면 실제와 어긋나므로
// 별 하나하나를 부분적으로 채운다.
function StarDisplay({ value, size }: { value: number; size: keyof typeof sizes }) {
  return (
    <span
      className={`inline-flex ${sizes[size]}`}
      role="img"
      aria-label={`5점 만점에 ${value.toFixed(2)}점`}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <PartialStar key={i} fill={Math.min(Math.max(value - i, 0), 1)} />
      ))}
    </span>
  )
}

/**
 * 별 위를 훑어 0.1 단위로 매긴다.
 * 정수로만 매기면 3.7 같은 점수를 못 주고, 그러면 평균도 뭉툭해진다.
 */
function StarInput({
  value,
  onChange,
  size,
}: {
  value: number
  onChange: (next: number) => void
  size: keyof typeof sizes
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const valueAt = (clientX: number) => {
    const box = ref.current?.getBoundingClientRect()
    if (!box) return 0
    return snap(((clientX - box.left) / box.width) * 5)
  }

  return (
    <span className="inline-flex items-center gap-3">
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={value}
        aria-label="별점"
        onPointerDown={(e) => {
          // 별 사이를 눌러 훑기 시작할 때 브라우저 기본 드래그(텍스트 선택)가
          // 끼어들면 별 다섯 개가 한 덩이로 선택돼버린다 — 슬라이더로만 쓰게 막는다
          e.preventDefault()
          e.currentTarget.setPointerCapture(e.pointerId)
          setDragging(true)
          onChange(valueAt(e.clientX))
        }}
        onPointerMove={(e) => {
          if (dragging) onChange(valueAt(e.clientX))
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId)
          setDragging(false)
        }}
        onPointerCancel={() => setDragging(false)}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 0.5 : 0.1
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(snap(value + step))
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(snap(value - step))
          else if (e.key === 'Home') onChange(0)
          else if (e.key === 'End') onChange(5)
          else return
          e.preventDefault()
        }}
        className={`inline-flex cursor-pointer touch-none select-none rounded-xs ${sizes[size]}`}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <PartialStar key={i} fill={Math.min(Math.max(value - i, 0), 1)} />
        ))}
      </div>

      <NumberEntry value={value} onChange={onChange} />
    </span>
  )
}

/** 별을 훑는 게 어중간할 때를 위해 숫자로도 넣을 수 있게 둔다 */
function NumberEntry({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  const [text, setText] = useState(value.toFixed(1))
  const [editing, setEditing] = useState(false)

  // 내가 타이핑 중이 아닐 때만 바깥 값을 따라간다
  if (!editing && text !== value.toFixed(1)) setText(value.toFixed(1))

  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      max={5}
      step={0.1}
      value={text}
      aria-label="별점 직접 입력"
      onFocus={() => setEditing(true)}
      onChange={(e) => {
        setText(e.target.value)
        const n = Number(e.target.value)
        if (e.target.value !== '' && !Number.isNaN(n)) onChange(snap(n))
      }}
      onBlur={() => {
        setEditing(false)
        setText(value.toFixed(1))
      }}
      className="w-14 rounded-sm border border-neutral-200 px-2 py-1 text-center font-mono text-sm tabular-nums outline-none focus:border-neutral-400"
    />
  )
}

function PartialStar({ fill }: { fill: number }) {
  return (
    <span className="relative inline-block" aria-hidden>
      <span className="text-neutral-300">★</span>
      {fill > 0 && (
        <span
          className="absolute inset-y-0 left-0 overflow-hidden text-amber-500"
          style={{ width: `${fill * 100}%` }}
        >
          ★
        </span>
      )}
    </span>
  )
}
