import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import Cover from '@/components/Cover'
import RankSticker from '@/components/RankSticker'
import WorkTooltip from '@/components/WorkTooltip'
import type { BookcaseItem } from '@/components/Bookcase'
import { useLongPressPreview } from '@/hooks/useLongPressPreview'
import { KIND_ORDER, kindIcon, kindLabel } from '@/lib/workKind'
import { completedYearOf, topRanksByYear } from '@/lib/workRanking'
import type { User } from '@/types'

const yearOf = completedYearOf

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

  // 순서는 완료순으로 두고 스티커만 얹으므로, 등수는 따로 계산해 둔다.
  // 규칙은 작품 상세와 같은 것을 쓴다([topRanksByYear]).
  const rankById = topRanksByYear(
    items.map((item) => ({
      id: item.id,
      average: item.average ?? 0,
      voterCount: item.voterCount ?? 0,
      finishedAt: item.finishedAt,
      publishedRatings: item.publishedRatings,
    })),
  )

  const yearRange =
    years.length === 0
      ? null
      : years.length === 1
        ? `${years[0]}`
        : `${years[years.length - 1]} – ${years[0]}`

  return (
    <section className="app-card flex flex-col gap-6 p-5 sm:p-7">
      {/* 제목과 연도 탭 사이는 선이 아니라 여백으로 끊는다 — 판의 경계는 app-card 한 겹뿐이다 */}
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">함께 읽은 책</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {items.length}작품{yearRange && ` · ${yearRange}`}
            </p>
          </div>
          <Link to={`/${studySlug}/books`} className="app-pill">
            전체보기
            <ArrowRight aria-hidden className="size-4" strokeWidth={2} />
          </Link>
        </div>

        {/*
          연도는 한 줄에 나란히 놓인 같은 축의 선택지라, 고른 것만 검정으로 튀우는 대신
          띠 위에서 흰 칸이 움직이는 모양(세그먼트)으로 보여준다.
        */}
        {years.length > 1 && (
          <div className="flex justify-center gap-3">
            {years.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setSelectedYear(year)}
                className={`cursor-pointer rounded-full px-5 py-1.5 text-sm font-medium tabular-nums transition-colors ${
                  year === activeYear
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
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
      <div className="grid grid-cols-5 gap-3 sm:gap-4">
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

      {/* 배경 판 없이 숫자와 아이콘만 남기고, 얇은 구분선으로 세 종류를 나눈다. */}
      <div className="grid grid-cols-3 border-t border-neutral-100 pt-5">
        {KIND_ORDER.map((kind) => {
          const Icon = kindIcon[kind]

          return (
            <div
              key={kind}
              className="flex items-center justify-center gap-3 border-r border-neutral-100 last:border-r-0"
            >
              <Icon className="size-6 text-neutral-400" aria-hidden strokeWidth={1.75} />
              <div className="flex flex-col">
                <span className="font-serif text-2xl font-semibold text-neutral-900 tabular-nums">
                  {items.filter((item) => item.kind === kind).length}
                </span>
                <span className="text-xs text-neutral-500">{kindLabel[kind]}</span>
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
    <Link to={item.href} {...longPress.handlers} className="group flex flex-col items-center gap-2">
      {/*
        폭은 반드시 이 바깥 div 로 잡는다 — Cover 는 size="lg" 일 때 스스로 w-full 을
        붙이므로, className 으로 폭을 넘기면 같은 width 유틸리티끼리 부딪혀서
        어느 쪽이 이길지 Tailwind 의 출력 순서에 달리게 된다(실제로 w-full 이 이겼다).
      */}
      <div className="relative w-full max-w-28">
        <Cover
          work={item}
          size="lg"
          className="w-full transition-transform group-hover:-translate-y-0.5"
        />
        {rank && <RankSticker rank={rank} size="sm" className="-top-1.5 -left-1.5 -rotate-6" />}
      </div>
      <span className="text-xs text-neutral-500 tabular-nums">{order}</span>

      <WorkTooltip item={item} users={users} anchor={longPress.anchor} open={longPress.open} />
    </Link>
  )
}
