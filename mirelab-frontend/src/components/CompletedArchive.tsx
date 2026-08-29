import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { WorkTile, WorkTileGrid } from '@/components/WorkTile'
import type { BookcaseItem } from '@/components/Bookcase'
import { KIND_ORDER, kindIcon, kindLabel } from '@/lib/workKind'
import { completedYearOf, topRanksByYear } from '@/lib/workRanking'
import type { User } from '@/types'
import { WorkStatus } from '@/types'

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
    <section className="flex flex-col gap-8">
      {/* 제목과 연도 탭 사이는 선이 아니라 여백으로 끊는다 — 판의 경계는 app-card 한 겹뿐이다 */}
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">함께 읽은 책</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {items.length}작품{yearRange && ` · ${yearRange}`}
            </p>
          </div>
          {/* 여기 있는 건 모두 다 읽은 작품이라, 전체보기도 완료만 걸린 목록으로 이어진다 */}
          <Link to={`/${studySlug}/books?status=${WorkStatus.DONE}`} className="app-pill">
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
        내 서재와 같은 표지 칸([WorkTile])을 쓴다 — 같은 책이 화면마다 다르게 보이지 않게.
        다만 여기 있는 건 모두 다 읽은 작품이라 상태 배지는 끄고, 그 자리 대신 그 해에 몇
        번째로 끝냈는지를 번호로 붙인다.
      */}
      <WorkTileGrid label={`${activeYear}년에 함께 읽은 작품`}>
        {shown.map((item, index) => (
          <WorkTile
            key={item.id}
            item={item}
            users={users}
            order={index + 1}
            rank={rankById.get(item.id)}
            showStatus={false}
          />
        ))}
      </WorkTileGrid>

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
                <span className="text-2xl font-semibold text-neutral-900 tabular-nums">
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
