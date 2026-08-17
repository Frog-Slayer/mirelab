import { useEffect, useRef, useState } from 'react'

/** "시작" 누르면 뜬다 — 언제 시작하는지 여기서 바로 회차를 하나 잡는다 */
export default function StartDialog({
  title,
  submitLabel,
  onStart,
  onClose,
}: {
  title: string
  submitLabel: string
  onStart: (meetAt: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('20:00')

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close()
      }}
      className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-sm border border-neutral-200 p-0 backdrop:bg-neutral-900/30"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!date) return
          onStart(`${date}T${time}`)
          ref.current?.close()
        }}
        className="flex flex-col gap-5 p-5"
      >
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

        <InlineDatePicker value={date} onChange={setDate} />

        <label className="flex items-center gap-2 self-start text-sm text-neutral-600">
          시간
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-sm border border-neutral-200 px-2 py-1 text-sm outline-none focus:border-neutral-400"
          />
        </label>

        <button type="submit" disabled={!date} className="app-button app-button-primary self-start">
          {submitLabel}
        </button>
      </form>
    </dialog>
  )
}

/** datetime-local 입력창 대신 바로 뜨는 작은 달력 — 클릭 한 번으로 날짜를 고른다 */
function InlineDatePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (date: string) => void
}) {
  const today = new Date()
  const initial = value ? new Date(value) : today
  const [cursor, setCursor] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1))

  const year = cursor.getFullYear()
  const month = cursor.getMonth()

  const start = new Date(year, month, 1)
  start.setDate(start.getDate() - start.getDay())
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })

  const key = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const move = (delta: number) => setCursor(new Date(year, month + delta, 1))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="flex-1 font-serif text-sm tabular-nums">
          {year}년 {month + 1}월
        </span>
        <button
          type="button"
          onClick={() => move(-1)}
          className="cursor-pointer rounded-sm border border-neutral-200 px-1.5 py-0.5 text-xs text-neutral-500 hover:border-neutral-400"
          aria-label="이전 달"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          className="cursor-pointer rounded-sm border border-neutral-200 px-1.5 py-0.5 text-xs text-neutral-500 hover:border-neutral-400"
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {['일', '월', '화', '수', '목', '금', '토'].map((w) => (
          <span key={w} className="py-1 text-center font-mono text-[10px] text-neutral-400">
            {w}
          </span>
        ))}
        {days.map((d) => {
          const k = key(d)
          const inMonth = d.getMonth() === month
          const isToday = k === key(today)
          const isSelected = k === value
          return (
            <button
              key={k}
              type="button"
              onClick={() => onChange(k)}
              className={`aspect-square rounded-md text-xs tabular-nums ${
                isSelected
                  ? 'bg-neutral-900 text-white'
                  : isToday
                    ? 'border border-neutral-400 text-neutral-900'
                    : inMonth
                      ? 'text-neutral-700 hover:bg-neutral-100'
                      : 'text-neutral-300 hover:bg-neutral-50'
              }`}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
