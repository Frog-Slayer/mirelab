import { useState } from 'react'
import { Link } from 'react-router'
import type { ScheduleItem } from '@/mocks/api'

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
    const k = item.at.slice(0, 10)
    byDay.set(k, [...(byDay.get(k) ?? []), item])
  }

  const move = (delta: number) => setCursor(new Date(year, month + delta, 1))

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <h2 className="font-serif text-xl tabular-nums">
          {year}년 {month + 1}월
        </h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => move(-1)}
            className="cursor-pointer rounded-sm border border-neutral-200 px-2 py-0.5 text-xs text-neutral-500 hover:border-neutral-400"
            aria-label="이전 달"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="cursor-pointer rounded-sm border border-neutral-200 px-2 py-0.5 text-xs text-neutral-500 hover:border-neutral-400"
          >
            오늘
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            className="cursor-pointer rounded-sm border border-neutral-200 px-2 py-0.5 text-xs text-neutral-500 hover:border-neutral-400"
            aria-label="다음 달"
          >
            ›
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[36rem]">
          <div className="grid grid-cols-7 border-b border-neutral-200">
            {SESSIONDAYS.map((w, i) => (
              <div
                key={w}
                className={`py-1.5 text-center font-mono text-[10px] tracking-wider ${
                  i === 0 ? 'text-rose-400' : 'text-neutral-400'
                }`}
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((d) => {
              const inMonth = d.getMonth() === month
              const isToday = key(d) === key(today)
              const dayItems = byDay.get(key(d)) ?? []

              return (
                <div
                  key={key(d)}
                  className={`min-h-20 border-r border-b border-neutral-100 p-1.5 ${
                    inMonth ? '' : 'bg-neutral-50/60'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className={`inline-flex size-5 items-center justify-center rounded-full font-mono text-[11px] tabular-nums ${
                        isToday
                          ? 'bg-neutral-900 text-white'
                          : inMonth
                            ? d.getDay() === 0
                              ? 'text-rose-500'
                              : 'text-neutral-700'
                            : 'text-neutral-300'
                      }`}
                    >
                      {d.getDate()}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-col gap-1">
                    {dayItems.map((item, i) => {
                      const time = item.at.slice(11, 16)
                      const chip = (
                        <span className="block truncate">
                          <span className="font-mono text-[9px] opacity-70">{time}</span>{' '}
                          {item.title}
                        </span>
                      )
                      const cls =
                        item.kind === 'SESSION'
                          ? 'border-emerald-600/40 bg-emerald-50 text-emerald-800'
                          : 'border-neutral-300 bg-neutral-100 text-neutral-600'

                      return item.sessionId ? (
                        <Link
                          key={i}
                          to={`/${slug}/w/${item.sessionId}`}
                          className={`rounded-xs border px-1 py-0.5 text-[10px] leading-tight hover:brightness-95 ${cls}`}
                          title={item.note}
                        >
                          {chip}
                        </Link>
                      ) : (
                        <span
                          key={i}
                          className={`rounded-xs border px-1 py-0.5 text-[10px] leading-tight ${cls}`}
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
