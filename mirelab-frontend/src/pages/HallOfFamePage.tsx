import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import Cover from '@/components/Cover'
import Stars from '@/components/Stars'
import PickNote from '@/components/PickNote'
import ThisSessionBanner from '@/components/ThisSessionBanner'
import { useStudy } from '@/hooks/useStudy'
import { getHallOfFame, type HallSort, type RankedWork } from '@/mocks/api'
import { formatRating } from '@/lib/format'
import type { User } from '@/types'
import { WorkKind } from '@/types'

type Filter = 'ALL' | 'BOOK' | 'MOVIE'

const filters: Array<{ key: Filter; label: string }> = [
  { key: 'ALL', label: '전체' },
  { key: 'BOOK', label: '책' },
  { key: 'MOVIE', label: '영화' },
]

export default function HallOfFamePage() {
  const { study, members } = useStudy()
  const [filter, setFilter] = useState<Filter>('ALL')
  const [sort, setSort] = useState<HallSort>('rating')

  const { data: works = [], isPending } = useQuery({
    queryKey: ['hall', study?.id, sort],
    queryFn: () => getHallOfFame(study!.id, sort),
    enabled: !!study,
  })

  if (!study) return null

  const shown = works.filter((w) => filter === 'ALL' || w.kind === filter)
  const [first, second, third, ...rest] = shown

  return (
    <div className="flex flex-col gap-10">
      <ThisSessionBanner />

      <section className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-5 border-b border-neutral-200 pb-6">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-3xl font-semibold tracking-[-0.03em]">명예의 전당</h1>
            <p className="text-sm text-neutral-500">
              지금까지 함께 읽고 본 {works.length}편 · 평균 ★{' '}
              {formatRating(works.reduce((a, w) => a + w.average, 0) / (works.length || 1))}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded-lg bg-neutral-100 p-1">
              {filters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-xs transition-colors ${
                    filter === f.key
                      ? 'bg-white font-medium text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as HallSort)}
              className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-600 outline-none"
            >
              <option value="rating">별점순</option>
              <option value="recent">최근순</option>
            </select>
          </div>
        </div>

        {isPending && <p className="text-sm text-neutral-400">불러오는 중…</p>}

        {sort === 'rating' && first && (
          <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
            <Podium work={first} rank={1} slug={study.slug} users={members} featured />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-2">
              {second && <Podium work={second} rank={2} slug={study.slug} users={members} />}
              {third && <Podium work={third} rank={3} slug={study.slug} users={members} />}
            </div>
          </div>
        )}

        <ol className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {(sort === 'rating' ? rest : shown).map((work, i) => (
            <RankRow
              key={work.id}
              work={work}
              rank={sort === 'rating' ? i + 4 : i + 1}
              showRank={sort === 'rating'}
              slug={study.slug}
              users={members}
            />
          ))}
        </ol>
      </section>
    </div>
  )
}

function Podium({
  work,
  rank,
  slug,
  users,
  featured = false,
}: {
  work: RankedWork
  rank: number
  slug: string
  users: User[]
  featured?: boolean
}) {
  return (
    <Link
      to={`/${slug}/books/${work.id}`}
      className={`group relative flex h-full rounded-xl border border-neutral-200 bg-white shadow-sm transition-colors hover:border-emerald-300 ${
        featured ? 'min-h-72 items-center gap-7 p-7 sm:p-8' : 'min-h-36 gap-4 p-5'
      }`}
    >
      <span className="absolute top-4 right-4 text-3xl font-semibold text-neutral-200 tabular-nums">
        {rank}
      </span>
      <div className={featured ? 'w-32 flex-none sm:w-40' : 'w-16 flex-none'}>
        <Cover work={work} size="lg" />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className={`pr-6 leading-tight font-semibold ${featured ? 'text-2xl' : 'text-base'}`}>
          {work.title}
        </span>
        <span className={featured ? 'text-sm text-neutral-500' : 'text-xs text-neutral-500'}>
          {work.author} · {work.year}
        </span>
        <div className="flex items-center gap-3 pt-1">
          <span className={`font-semibold tabular-nums ${featured ? 'text-3xl' : 'text-xl'}`}>
            {formatRating(work.average)}
          </span>
          <Stars value={work.average} size="sm" />
        </div>
        <div className="mt-auto pt-2">
          <PickNote addedBy={work.addedBy} reason={work.reason} users={users} />
        </div>
      </div>
    </Link>
  )
}

function RankRow({
  work,
  rank,
  showRank,
  slug,
  users,
}: {
  work: RankedWork
  rank: number
  showRank: boolean
  slug: string
  users: User[]
}) {
  return (
    <li>
      <Link
        to={`/${slug}/books/${work.id}`}
        className="group flex items-center gap-5 border-b border-neutral-100 px-4 py-4 transition-colors last:border-0 hover:bg-neutral-50"
      >
        {showRank && (
          <span className="w-8 text-right text-sm font-medium text-neutral-400 tabular-nums">
            {rank}
          </span>
        )}
        <Cover work={work} size="sm" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">
            {work.title}
            <span className="ml-2 text-xs font-normal text-neutral-400">
              {work.kind === WorkKind.MOVIE ? '영화' : '책'}
            </span>
          </span>
          <span className="truncate text-xs text-neutral-500">{work.author}</span>
          <PickNote addedBy={work.addedBy} reason={work.reason} users={users} />
        </div>
        <div className="flex items-center gap-2">
          <Stars value={work.average} size="sm" />
          <span className="w-8 text-right text-sm font-medium tabular-nums">
            {formatRating(work.average)}
          </span>
        </div>
      </Link>
    </li>
  )
}
