import { useEffect, useMemo, useState } from 'react'
import { Star } from 'lucide-react'
import { Link } from 'react-router'
import Avatar from '@/components/Avatar'
import KindTag from '@/components/KindTag'
import { formatRating } from '@/lib/format'
import type { Blurb } from '@/lib/workApi'
import type { User } from '@/types'

/** 한 줄이 머무는 시간과 다음 줄로 밀려 올라가는 데 걸리는 시간 */
const HOLD_MS = 4000
const SLIDE_MS = 600

/**
 * 창 하나의 높이(px). 창과 그 안의 줄, 그리고 한 번에 밀어 올리는 거리가 모두 이 값이어야
 * 한 칸씩 딱 맞게 넘어간다 — 셋 중 하나만 어긋나도 줄이 반쯤 걸친 채 멈춘다.
 *
 * px 로 두는 이유: transform 의 translateY 퍼센트는 "움직이는 그 요소 자신의 높이" 기준이라,
 * 줄 전체를 담은 컨테이너에 -100% 를 주면 한 줄이 아니라 스택 전체가 통째로 올라가 버린다.
 */
const ROW_HEIGHT = 96

const ROW_CLASS = 'flex items-center gap-7 px-4'

export default function BlurbTicker({
  blurbs,
  users,
  studySlug,
}: {
  blurbs: Blurb[]
  users: User[]
  studySlug: string
}) {
  // 순서는 열 때 한 번만 섞는다 — 볼 때마다 다른 한줄평으로 시작하되, 도는 동안에는
  // 순서가 흔들리지 않아야 방금 지나간 줄을 눈으로 되짚을 수 있다.
  const list = useMemo(() => shuffle(blurbs), [blurbs])

  const [index, setIndex] = useState(0)
  const [sliding, setSliding] = useState(true)
  const [paused, setPaused] = useState(false)

  const rotating = list.length > 1

  useEffect(() => {
    if (!rotating || paused) return

    const timer = setInterval(() => setIndex((current) => current + 1), HOLD_MS)
    return () => clearInterval(timer)
  }, [rotating, paused])

  /**
   * 마지막 줄 다음에는 맨 앞 줄의 복제본이 있다. 거기까지 올라간 뒤 애니메이션을 끄고
   * 진짜 첫 줄로 되돌리면, 눈에는 계속 위로만 흐르는 것처럼 보인다 — 그냥 0 으로
   * 돌리면 지나온 줄들을 거슬러 아래로 주르륵 내려가는 게 보인다.
   */
  useEffect(() => {
    if (index !== list.length) return

    const timer = setTimeout(() => {
      setSliding(false)
      setIndex(0)
    }, SLIDE_MS)
    return () => clearTimeout(timer)
  }, [index, list.length])

  // 되돌린 위치가 화면에 반영된 뒤에 애니메이션을 다시 켠다. 같은 프레임에 켜면
  // 브라우저가 두 변화를 묶어버려서 결국 거슬러 내려가는 게 보인다.
  useEffect(() => {
    if (sliding) return

    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setSliding(true))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [sliding])

  if (list.length === 0) return null

  const rows = rotating ? [...list, list[0]] : list

  return (
    <div
      /*
        isolate: 카드 안에서 쓰는 z-index(배경 인용부호와 줄 스택)를 카드 안에 가둔다.
        없으면 안쪽 z-10 이 헤더(sticky z-10)와 같은 층에서 겨루는데, DOM 상 뒤에 있는
        쪽이 이겨서 스크롤할 때 한줄평이 헤더 위로 올라타 보인다.
      */
      className="app-card relative isolate overflow-hidden"
      style={{ height: ROW_HEIGHT }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* 배경의 인용부호 — 글자 위로 겹쳐도 방해되지 않게 옅게 깔고 클릭도 통과시킨다 */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-5 -bottom-8 z-0 font-serif text-8xl leading-none text-neutral-200 select-none"
      >
        ”
      </span>

      <div
        className={`relative z-10 ${sliding ? 'transition-transform ease-in-out motion-reduce:transition-none' : ''}`}
        style={{
          transform: `translateY(-${index * ROW_HEIGHT}px)`,
          transitionDuration: sliding ? `${SLIDE_MS}ms` : undefined,
        }}
      >
        {rows.map((blurb, row) => (
          <Row
            // 마지막 복제본은 첫 줄과 같은 한줄평이라 id 만으로는 키가 겹친다
            key={`${blurb.workId}-${blurb.userId}-${row}`}
            blurb={blurb}
            users={users}
            studySlug={studySlug}
          />
        ))}
      </div>
    </div>
  )
}

function Row({ blurb, users, studySlug }: { blurb: Blurb; users: User[]; studySlug: string }) {
  const writer = users.find((user) => user.id === blurb.userId)

  return (
    <Link
      to={`/${studySlug}/books/${blurb.workId}`}
      style={{ height: ROW_HEIGHT }}
      className={`${ROW_CLASS} group`}
    >
      {writer && (
        <div className="flex flex-none items-center gap-2">
          <Avatar user={writer} size="sm" />
          <span className="text-sm font-medium text-neutral-700">{writer.name}</span>
        </div>
      )}

      <div className="app-cover h-12 w-8 flex-none overflow-hidden rounded-md bg-neutral-100">
        {blurb.coverUrl ? (
          <img src={blurb.coverUrl} alt={blurb.title} className="h-full w-full object-cover" />
        ) : (
          <span className="sr-only">{blurb.title}</span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <KindTag kind={blurb.kind} className="flex-none" />
          <Dot />
          <span className="truncate text-sm font-semibold text-neutral-900 group-hover:underline">
            {blurb.title}
          </span>
          {blurb.author && (
            <>
              <Dot />
              <span className="flex-none truncate text-xs text-neutral-500">{blurb.author}</span>
            </>
          )}
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`inline-flex flex-none items-center gap-1 rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-xs font-semibold tabular-nums ${ratingToneClass(blurb.rating)}`}
          >
            <Star aria-hidden className="size-3 fill-current" />
            {formatRating(blurb.rating)}
          </span>
          <p className="min-w-0 truncate text-sm text-neutral-700">{blurb.text}</p>
        </div>

        <div className="text-xs text-neutral-500">
          평균 <span className="tabular-nums">★{formatRating(blurb.average)}</span>
        </div>
      </div>
    </Link>
  )
}

/** 점수의 의미색은 유지하고 배지 표면만 흰색으로 통일한다. */
function ratingToneClass(rating: number): string {
  if (rating >= 3.5) return 'text-red-600'
  if (rating >= 2.5) return 'text-amber-500'
  return 'text-neutral-900'
}

function Dot() {
  return (
    <span aria-hidden className="flex-none text-neutral-300">
      ·
    </span>
  )
}

/** 원본을 건드리지 않고 섞는다 — 부모가 넘긴 배열은 캐시된 쿼리 결과일 수 있다 */
function shuffle(items: Blurb[]): Blurb[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
