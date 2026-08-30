import { useState } from 'react'
import { Link } from 'react-router'
import type { ScheduleItem } from '@/lib/scheduleApi'

const SESSIONDAYS = ['일', '월', '화', '수', '목', '금', '토']

interface Props {
  items: ScheduleItem[]
  slug: string
}

export default function MonthCalendar({ items, slug }: Props) {
  const today = new Date()
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  const year = cursor.getFullYear()
  const month = cursor.getMonth()

  // 달력은 그 달 1일이 속한 주의 일요일부터 6주치를 그린다
  const start = new Date(year, month, 1)
  start.setDate(start.getDate() - start.getDay())
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })

  const key = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const byDay = new Map<string, ScheduleItem[]>()
  for (const item of items) {
    const k = key(new Date(item.at))
    byDay.set(k, [...(byDay.get(k) ?? []), item])
  }

  const move = (delta: number) => setCursor(new Date(year, month + delta, 1))

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <h2 className="font-serif text-2xl tabular-nums">
          {year}년 {month + 1}월
        </h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => move(-1)}
            className="cursor-pointer rounded-lg border border-neutral-200 px-2 py-0.5 text-sm text-neutral-500 hover:border-neutral-400"
            aria-label="이전 달"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="cursor-pointer rounded-lg border border-neutral-200 px-2 py-0.5 text-sm text-neutral-500 hover:border-neutral-400"
          >
            오늘
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            className="cursor-pointer rounded-lg border border-neutral-200 px-2 py-0.5 text-sm text-neutral-500 hover:border-neutral-400"
            aria-label="다음 달"
          >
            ›
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[42rem] border-t border-l border-neutral-200">
          <div className="grid grid-cols-7 border-b border-neutral-200">
            {SESSIONDAYS.map((w, i) => {
              const weekend = i === 0 || i === 6
              return (
                <div
                  key={w}
                  className={`border-r border-neutral-200 py-2 text-center font-mono text-xs tracking-wider ${
                    weekend ? 'bg-neutral-50 text-neutral-400' : 'text-neutral-500'
                  }`}
                >
                  {w}
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-7">
            {days.map((d) => {
              const inMonth = d.getMonth() === month
              const isToday = key(d) === key(today)
              const isWeekend = d.getDay() === 0 || d.getDay() === 6
              const dayItems = byDay.get(key(d)) ?? []
              const bg = !inMonth ? 'bg-neutral-50/60' : isWeekend ? 'bg-neutral-50' : ''

              return (
                <div
                  key={key(d)}
                  className={`min-h-24 border-r border-b border-neutral-200 p-2 ${bg}`}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span
                      className={`inline-flex size-6 items-center justify-center rounded-full font-mono text-sm tabular-nums ${
                        isToday
                          ? 'bg-neutral-900 text-white'
                          : inMonth
                            ? isWeekend
                              ? 'text-neutral-400'
                              : 'text-neutral-700'
                            : 'text-neutral-300'
                      }`}
                    >
                      {d.getDate()}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-col gap-1">
                    {dayItems.map((item, i) => {
                      const at = new Date(item.at)
                      const time = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
                      const chip = (
                        <span className="block truncate">
                          <span className="font-mono text-xs opacity-70">{time}</span> {item.title}
                        </span>
                      )
                      const cls =
                        item.kind === 'SESSION'
                          ? 'border-emerald-600/40 bg-emerald-50 text-emerald-800'
                          : 'border-neutral-300 bg-neutral-100 text-neutral-600'

                      return item.workId ? (
                        <Link
                          key={i}
                          to={`/${slug}/books/${item.workId}`}
                          className={`rounded-md border px-1.5 py-1 text-xs leading-tight hover:brightness-95 ${cls}`}
                          title={item.note}
                        >
                          {chip}
                        </Link>
                      ) : (
                        <span
                          key={i}
                          className={`rounded-md border px-1.5 py-1 text-xs leading-tight ${cls}`}
                        >
                          {chip}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
