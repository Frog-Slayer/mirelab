import { useState } from 'react'
import { Link } from 'react-router'
import Cover from '@/components/Cover'
import type { BookcaseItem } from '@/components/Bookcase'
import { KIND_ORDER, kindIcon, kindLabel } from '@/lib/workKind'

function yearOf(item: BookcaseItem) {
  return item.finishedAt ? new Date(item.finishedAt).getFullYear() : null
}

export default function CompletedArchive({
  items,
  studySlug,
}: {
  items: BookcaseItem[]
  studySlug: string
}) {
  const years = [...new Set(items.map(yearOf).filter((y): y is number => y !== null))].sort(
    (a, b) => b - a,
  )
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const activeYear = selectedYear !== null && years.includes(selectedYear) ? selectedYear : years[0]

  const shown = items.filter((item) => yearOf(item) === activeYear)

  const yearRange =
    years.length === 0 ? null : years.length === 1 ? `${years[0]}` : `${years[years.length - 1]} – ${years[0]}`

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex flex-col gap-4 border-b border-neutral-200 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.03em]">함께 읽은 책</h1>
            <p className="mt-1 text-sm text-neutral-400">
              {items.length}작품{yearRange && ` · ${yearRange}`}
            </p>
          </div>
          <Link
            to={`/${studySlug}/books`}
            className="shrink-0 rounded-full border border-neutral-200 px-4 py-1.5 text-sm font-medium text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900"
          >
            전체보기 →
          </Link>
        </div>

        {years.length > 1 && (
          <div className="flex justify-center gap-6">
            {years.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setSelectedYear(year)}
                className={`rounded-full px-5 py-1 text-base font-medium transition ${
                  year === activeYear
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-x-10 gap-y-10 px-4 sm:grid-cols-5 sm:px-10">
        {shown.map((item, index) => (
          <Link key={item.id} to={item.href} className="flex flex-col items-center gap-1.5">
            {/*
              표지는 칸을 다 채우지 않고 일부만 차지해서, 칸 사이가 더 벌어져 보이게 한다.
              폭은 반드시 이 바깥 div 로 잡는다 — Cover 는 size="lg" 일 때 스스로 w-full 을
              붙이므로, className 으로 폭을 넘기면 같은 width 유틸리티끼리 부딪혀서
              어느 쪽이 이길지 Tailwind 의 출력 순서에 달리게 된다(실제로 w-full 이 이겼다).
            */}
            <div className="w-[52%]">
              <Cover work={item} size="lg" className="w-full" />
            </div>
            <span className="text-xs text-neutral-400">{index + 1}</span>
          </Link>
        ))}
      </div>

      {/* 세 종류가 아래 공간을 정확히 3등분하고, 칸 사이는 세로선으로 나눈다 */}
      <div className="grid grid-cols-3 divide-x divide-neutral-100 border-t border-neutral-100 pt-5">
        {KIND_ORDER.map((kind) => {
          const Icon = kindIcon[kind]

          return (
            <div key={kind} className="flex items-center justify-center gap-3 text-neutral-600">
              <Icon className="size-6 text-neutral-400" aria-hidden />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-neutral-900">
                  {items.filter((item) => item.kind === kind).length}
                </span>
                <span className="text-xs tracking-wide text-neutral-400">{kindLabel[kind]}</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
