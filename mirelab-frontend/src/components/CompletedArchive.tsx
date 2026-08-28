import { useState } from 'react'
import { Link } from 'react-router'
import Cover from '@/components/Cover'
import RankSticker from '@/components/RankSticker'
import WorkTooltip from '@/components/WorkTooltip'
import type { BookcaseItem } from '@/components/Bookcase'
import { useLongPressPreview } from '@/hooks/useLongPressPreview'
import { KIND_ORDER, kindIcon, kindLabel } from '@/lib/workKind'
import type { User } from '@/types'

function yearOf(item: BookcaseItem) {
  return item.finishedAt ? new Date(item.finishedAt).getFullYear() : null
}

export default function CompletedArchive({
  items,
  users,
  studySlug,
}: {
  items: BookcaseItem[]
  /** 호버 카드에서 "누가 골랐는지"를 보여주려면 필요하다 */
  users: User[]
  studySlug: string
}) {
  const years = [...new Set(items.map(yearOf).filter((y): y is number => y !== null))].sort(
    (a, b) => b - a,
  )
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const activeYear = selectedYear !== null && years.includes(selectedYear) ? selectedYear : years[0]

  const shown = items.filter((item) => yearOf(item) === activeYear)

  /**
   * 그 해의 공개 평점 1~3위. 순서는 완료순으로 두고 스티커만 얹으므로, 여기서는 등수만
   * 따로 계산해 둔다. 아무도 공개로 매기지 않은 작품(voterCount 0)은 평균이 0 이라
   * 등수에서 뺀다 — 안 그러면 "0점짜리 3위"가 생긴다.
   */
  const rankById = new Map<string, 1 | 2 | 3>()
  shown
    .filter((item) => (item.voterCount ?? 0) > 0)
    .sort((a, b) => (b.average ?? 0) - (a.average ?? 0))
    .slice(0, 3)
    .forEach((item, index) => rankById.set(item.id, (index + 1) as 1 | 2 | 3))

  const yearRange =
    years.length === 0 ? null : years.length === 1 ? `${years[0]}` : `${years[years.length - 1]} – ${years[0]}`

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6">
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

      {/*
        칸 수는 고정(넓으면 5개, 좁으면 3개)이고 간격은 최소만 준다. 표지에 상한 폭을
        걸어두면 화면이 넓어질수록 칸에서 남는 만큼이 그대로 여백이 되므로, 간격을
        px 로 크게 박아두지 않아도 넓은 화면에서 알아서 넉넉해진다.
      */}
      <div className="grid grid-cols-5 gap-2 sm:gap-4">
        {shown.map((item, index) => (
          <ArchiveCover
            key={item.id}
            item={item}
            users={users}
            order={index + 1}
            rank={rankById.get(item.id)}
          />
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

function ArchiveCover({
  item,
  users,
  order,
  rank,
}: {
  item: BookcaseItem
  users: User[]
  /** 그 해에서 몇 번째로 끝냈는지 — 표지 아래 번호 */
  order: number
  /** 공개 평점 1~3위면 표지에 스티커가 붙는다 */
  rank?: 1 | 2 | 3
}) {
  const longPress = useLongPressPreview()

  return (
    <Link
      to={item.href}
      {...longPress.handlers}
      className="group relative flex flex-col items-center gap-1.5 hover:z-20"
    >
      {/*
        폭은 반드시 이 바깥 div 로 잡는다 — Cover 는 size="lg" 일 때 스스로 w-full 을
        붙이므로, className 으로 폭을 넘기면 같은 width 유틸리티끼리 부딪혀서
        어느 쪽이 이길지 Tailwind 의 출력 순서에 달리게 된다(실제로 w-full 이 이겼다).
      */}
      <div className="relative w-full max-w-28">
        <Cover work={item} size="lg" className="w-full" />
        {rank && <RankSticker rank={rank} size="sm" className="-top-1.5 -left-1.5 -rotate-6" />}
      </div>
      <span className="text-xs text-neutral-400">{order}</span>

      <WorkTooltip item={item} users={users} open={longPress.open} />
    </Link>
  )
}
