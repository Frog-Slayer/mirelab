import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import Cover from '@/components/Cover'
import Stars from '@/components/Stars'
import PickNote from '@/components/PickNote'
import { Bookcase, type BookcaseItem } from '@/components/Bookcase'
import RankSticker from '@/components/RankSticker'
import { useStudy } from '@/hooks/useStudy'
import { getHallOfFame, getLibrary, type LibraryEntry, type RankedWork } from '@/lib/workApi'
import { formatRating } from '@/lib/format'
import type { User } from '@/types'
import { WorkStatus } from '@/types'

type Filter = 'ALL' | 'BOOK' | 'MOVIE'

const filters: Array<{ key: Filter; label: string }> = [
  { key: 'ALL', label: '전체' },
  { key: 'BOOK', label: '책' },
  { key: 'MOVIE', label: '영화' },
]

export default function HallOfFamePage() {
  const { study, members } = useStudy()
  const [filter, setFilter] = useState<Filter>('ALL')

  const { data: works = [], isPending } = useQuery({
    queryKey: ['hall', study?.slug],
    queryFn: () => getHallOfFame(study!.slug),
    enabled: !!study,
  })
  const { data: allWorks = [] } = useQuery({
    queryKey: ['library', study?.slug],
    queryFn: () => getLibrary(study!.slug),
    enabled: !!study,
  })

  if (!study) return null

  const shown = works.filter((w) => filter === 'ALL' || w.kind === filter)
  const [first, second, third] = shown
  // 1~3위는 카드로만 보여준다 — 책장에는 완료작 4위 이하부터 둔다.
  const podiumIds = new Set([first, second, third].filter(Boolean).map((w) => w!.id))
  const byFilter = (work: LibraryEntry) => filter === 'ALL' || work.kind === filter

  const toItem = (work: LibraryEntry): BookcaseItem => ({
    id: work.id,
    title: work.title,
    author: work.author,
    year: work.year,
    kind: work.kind,
    status: work.status,
    href: `/${study.slug}/books/${work.id}`,
    average: work.average,
    voterCount: work.voterCount,
    addedBy: work.addedBy,
    reason: work.reason,
    description: work.description,
    coverUrl: work.coverUrl,
    actors: work.actors,
  })

  // 책장은 완료작만 보여준다. 읽는 중·후보를 포함한 목록은 상단의 '작품 목록'에서 확인한다.
  const completedItems = allWorks
    .filter((w) => byFilter(w) && !podiumIds.has(w.id) && w.status === WorkStatus.DONE)
    .sort((a, b) => b.average - a.average)
    .map(toItem)

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-5 border-b border-neutral-200 pb-6">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-3xl font-semibold tracking-[-0.03em]">명예의 전당</h1>
            <p className="text-sm text-neutral-500">
              지금까지 함께 읽고 본 {works.length}편 · 평균 ★{' '}
              {formatRating(works.reduce((a, w) => a + w.average, 0) / (works.length || 1))}
            </p>
          </div>

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
        </div>

        {isPending && <p className="text-sm text-neutral-400">불러오는 중…</p>}

        {first ? (
          <div className="grid gap-4 lg:grid-cols-[6.5fr_3.5fr]">
            <Podium work={first} rank={1} slug={study.slug} users={members} featured />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-2">
              {second && <Podium work={second} rank={2} slug={study.slug} users={members} />}
              {third && <Podium work={third} rank={3} slug={study.slug} users={members} />}
            </div>
          </div>
        ) : (
          !isPending && <p className="text-sm text-neutral-400">아직 완료한 작품이 없습니다.</p>
        )}
      </section>

      <section className="flex flex-col gap-6">
        <Bookcase completed={completedItems} others={[]} users={members} />
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
        featured ? 'min-h-72 items-start gap-7 p-7 sm:p-8' : 'min-h-36 gap-4 p-5'
      }`}
    >
      <RankSticker
        rank={rank as 1 | 2 | 3}
        size={featured ? 'lg' : 'sm'}
        className="-top-2 -left-2 -rotate-6"
      />

      <div className={`flex-none self-center ${featured ? 'w-32 sm:w-40' : 'w-16'}`}>
        <Cover work={work} size="lg" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 self-stretch">
        <span
          className={`leading-tight font-semibold ${featured ? 'pr-20 text-2xl sm:pr-24' : 'pr-20 text-base'}`}
        >
          {work.title}
        </span>
        <span className={featured ? 'text-sm text-neutral-500' : 'text-xs text-neutral-500'}>
          {work.author} · {work.year}
        </span>
        {work.actors && work.actors.length > 0 && (
          <span className={`truncate text-neutral-400 ${featured ? 'text-xs' : 'text-[11px]'}`}>
            출연 {work.actors.join(' · ')}
          </span>
        )}
        {/* 길이가 들쭉날쭉해도 항상 같은 높이만큼 차지해서, 아래 선정 이유 위치가 안 흔들리게 한다 */}
        <p
          className={`text-neutral-600 ${featured ? 'line-clamp-3 min-h-[3.75rem] text-sm' : 'line-clamp-1 min-h-4 text-xs'}`}
        >
          {work.description}
        </p>
        <div className="mt-auto pt-2">
          <PickNote addedBy={work.addedBy} reason={work.reason} users={users} />
        </div>
      </div>

      {/* 평점은 본문 흐름과 무관하게 카드 우상단에 고정한다 — 1위는 두 줄, 2·3위는 한 줄 */}
      {featured ? (
        <div className="absolute top-7 right-7 flex flex-col items-end gap-1 sm:top-8 sm:right-8">
          <span className="text-3xl font-semibold tabular-nums">{formatRating(work.average)}</span>
          <Stars value={work.average} size="sm" />
        </div>
      ) : (
        <div className="absolute top-5 right-5 flex items-center gap-1.5">
          <span className="text-xl font-semibold tabular-nums">{formatRating(work.average)}</span>
          <Stars value={work.average} size="sm" />
        </div>
      )}
    </Link>
  )
}
