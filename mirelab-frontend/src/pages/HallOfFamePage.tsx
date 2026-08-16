import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import Cover from '@/components/Cover'
import Stars from '@/components/Stars'
import PickNote from '@/components/PickNote'
import { Bookcase, type BookcaseItem } from '@/components/Bookcase'
import { useStudy } from '@/hooks/useStudy'
import { getHallOfFame, getLibrary, type RankedWork } from '@/mocks/api'
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
    queryKey: ['hall', study?.id],
    queryFn: () => getHallOfFame(study!.id),
    enabled: !!study,
  })
  const { data: allWorks = [] } = useQuery({
    queryKey: ['library', study?.id],
    queryFn: () => getLibrary(study!.id),
    enabled: !!study,
  })

  if (!study) return null

  const shown = works.filter((w) => filter === 'ALL' || w.kind === filter)
  const [first, second, third] = shown
  // 1~3위는 카드로만 보여준다 — 책장에는 4위 이하부터. 일단은 완료된 작품만 책장에 보여준다.
  const podiumIds = new Set([first, second, third].filter(Boolean).map((w) => w!.id))
  // 위 명예의 전당 필터(전체 · 책 · 영화)를 책장에도 그대로 적용한다.
  const shelfWorks = allWorks.filter(
    (work) =>
      (filter === 'ALL' || work.kind === filter) &&
      !podiumIds.has(work.id) &&
      work.status === WorkStatus.DONE,
  )

  const bookcaseItems: BookcaseItem[] = shelfWorks.map((work) => ({
    id: work.id,
    title: work.title,
    author: work.author,
    status: work.status,
    href: `/${study.slug}/books/${work.id}`,
  }))

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
          <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
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
        <Bookcase items={bookcaseItems} />
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
      <div className={`relative ${featured ? 'w-32 flex-none sm:w-40' : 'w-16 flex-none self-start'}`}>
        <Cover work={work} size="lg" />
        <RankSticker rank={rank as 1 | 2 | 3} />
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

const rankStickerColors: Record<1 | 2 | 3, { gradient: string; ring: string; text: string }> = {
  1: {
    gradient:
      'linear-gradient(155deg, #fff8dd 0%, #f6d365 22%, #caa233 45%, #8a6210 62%, #f9e79a 80%, #d4af37 100%)',
    ring: '#7a5608',
    text: '#4a3400',
  },
  2: {
    gradient:
      'linear-gradient(155deg, #ffffff 0%, #e6ebf0 22%, #a8b3bf 45%, #6b7684 62%, #eef2f6 80%, #b0b8c1 100%)',
    ring: '#5b6570',
    text: '#33383d',
  },
  3: {
    gradient:
      'linear-gradient(155deg, #f6dcc0 0%, #e0a469 22%, #a8632f 45%, #6e3d1c 62%, #f0c79a 80%, #b6733a 100%)',
    ring: '#5c331a',
    text: '#3c2410',
  },
}

// 별 모양은 아니고, 포스터에 붙인 스티커/실 같은 느낌의 톱니 원.
const stickerClipPath =
  'polygon(50% 0%, 61% 10%, 75% 5%, 80% 18%, 95% 20%, 93% 35%, 100% 50%, 93% 65%, 95% 80%, 80% 82%, 75% 95%, 61% 90%, 50% 100%, 39% 90%, 25% 95%, 20% 82%, 5% 80%, 7% 65%, 0% 50%, 7% 35%, 5% 20%, 20% 18%, 25% 5%, 39% 10%)'

/**
 * border/box-shadow 는 사각 박스 기준이라 톱니 clip-path 모양을 고르게 못 따라가서
 * (안쪽 흰 줄 두께가 꼭짓점/골 마다 달라 보임) 겹쳐 그리지 않는다.
 * 대신 같은 clip-path 를 쓰는 레이어를 크기만 줄여 겹쳐 쌓는다 — 링 두께가 어디서나 같다.
 */
function RankSticker({ rank }: { rank: 1 | 2 | 3 }) {
  const { gradient, ring, text } = rankStickerColors[rank]
  const sizeCls = rank === 1 ? 'size-11 text-sm sm:size-12 sm:text-base' : 'size-7 text-xs sm:size-8'
  const ringInset = rank === 1 ? '2px' : '1.3px'
  const lineInset = rank === 1 ? '3.5px' : '2.3px'

  return (
    <span
      aria-hidden
      className={`absolute -right-2 -bottom-2 ${sizeCls} rotate-6`}
      style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.4))' }}
    >
      {/* 바깥 링 */}
      <span className="absolute inset-0" style={{ background: ring, clipPath: stickerClipPath }} />
      {/* 안쪽 흰 줄 */}
      <span
        className="absolute"
        style={{ inset: ringInset, background: '#fff', clipPath: stickerClipPath }}
      />
      {/* 금속 면 + 숫자 */}
      <span
        className="absolute grid place-items-center font-bold"
        style={{
          inset: lineInset,
          background: gradient,
          color: text,
          clipPath: stickerClipPath,
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,.6), inset 0 -1px 2px rgba(0,0,0,.3)',
          textShadow: '0 1px 0 rgba(255,255,255,.5), 0 -1px 1px rgba(0,0,0,.35)',
        }}
      >
        {rank}
      </span>
    </span>
  )
}
