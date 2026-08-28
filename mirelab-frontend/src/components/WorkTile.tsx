import type { ReactNode } from 'react'
import { Users } from 'lucide-react'
import { Link } from 'react-router'
import Cover from '@/components/Cover'
import RankSticker, { type Rank } from '@/components/RankSticker'
import WorkTooltip from '@/components/WorkTooltip'
// 타입만 가져오므로 Bookcase 와 서로 참조해도 런타임 순환이 생기지 않는다(컴파일 때 지워진다).
import type { BookcaseItem } from '@/components/Bookcase'
import { useLongPressPreview } from '@/hooks/useLongPressPreview'
import type { User } from '@/types'
import { WorkKind, WorkStatus } from '@/types'

const statusLabel: Record<WorkStatus, string> = {
  [WorkStatus.CANDIDATE]: '후보',
  [WorkStatus.READING]: '읽는 중',
  [WorkStatus.DONE]: '완료',
}

/** 표지가 없을 때 대신 깔리는 색·글자. 종류마다 다른 지질(紙質)처럼 보이게 한다 */
const placeholderKindLabel: Record<WorkKind, string> = {
  [WorkKind.BOOK]: 'Book',
  [WorkKind.MOVIE]: 'Film',
  [WorkKind.GAME]: 'Game',
}

const placeholderTone: Record<WorkKind, string> = {
  [WorkKind.BOOK]: 'bg-[#dfe9e5] text-[#24443a]',
  [WorkKind.MOVIE]: 'bg-[#e3e7ed] text-[#303946]',
  [WorkKind.GAME]: 'bg-[#e2e8ec] text-[#293943]',
}

/**
 * 표지 칸들이 늘어서는 그리드. 칸 폭은 고정하고 열 수는 화면에 맡긴다.
 *
 * `ol` 인 이유: 내 서재는 내 평점순, 아카이브는 완료순이라 두 곳 모두 순서가 뜻을 가진다.
 */
export function WorkTileGrid({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <ol
      aria-label={label}
      className="grid grid-cols-[repeat(auto-fill,minmax(7.25rem,1fr))] gap-x-4 gap-y-8 sm:gap-x-5"
    >
      {children}
    </ol>
  )
}

/**
 * 표지 한 장 = 작품 하나. 내 서재(Bookcase)와 홈의 '함께 읽은 책'(CompletedArchive)이
 * 같은 이 칸을 쓴다 — 두 곳이 각자 표지 칸을 갖고 있으면 한쪽만 손봤을 때 같은 책이
 * 화면마다 다르게 보인다.
 *
 * 두 곳의 차이는 프롭으로만 둔다: 아카이브는 상태 배지가 없고(이미 다 읽은 것들이다)
 * 대신 그 해 몇 번째로 끝냈는지를 번호로 붙인다.
 */
export function WorkTile({
  item,
  users = [],
  order,
  rank,
  showStatus = true,
}: {
  item: BookcaseItem
  /** 호버 카드에서 "누가 왜 골랐는지"를 보여주려면 필요하다 */
  users?: User[]
  /** 주면 제목 아래 줄 맨 앞에 두 자리 번호로 붙는다 */
  order?: number
  /** 표지에 붙는 등수 스티커. 안 주면 item.rank(1~3위)를 따른다 */
  rank?: Rank
  showStatus?: boolean
}) {
  const longPress = useLongPressPreview()

  const shownRank = rank ?? (item.rank && item.rank <= 3 ? (item.rank as Rank) : undefined)

  return (
    <li className="group/item relative min-w-0">
      <Link
        to={item.href}
        {...longPress.handlers}
        className="block focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-3 focus-visible:outline-none"
        aria-label={[
          item.title,
          item.author,
          showStatus ? statusLabel[item.status] : null,
          item.source && `${item.source} 스터디에서 읽은 책`,
        ]
          .filter(Boolean)
          .join(', ')}
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-neutral-100 ring-1 ring-neutral-950/10 transition-transform duration-200 group-hover/item:-translate-y-1">
          {item.coverUrl ? (
            <Cover work={item} size="lg" className="h-full w-full rounded-lg object-cover" />
          ) : (
            <div
              className={`flex h-full flex-col justify-between p-4 ${placeholderTone[item.kind]}`}
            >
              <span className="text-[10px] font-semibold tracking-[0.16em] uppercase opacity-55">
                {placeholderKindLabel[item.kind]}
              </span>
              <span className="line-clamp-5 text-base leading-snug font-semibold tracking-tight">
                {item.title}
              </span>
              <span className="truncate text-[10px] opacity-60">{item.author || '작자 미상'}</span>
            </div>
          )}

          {showStatus && (
            <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/88 px-2 py-1 text-[10px] font-medium text-neutral-700 ring-1 ring-neutral-950/[0.06] backdrop-blur-sm">
              <span
                className={`size-1.5 rounded-full ${
                  item.status === WorkStatus.READING
                    ? 'bg-emerald-500'
                    : item.status === WorkStatus.DONE
                      ? 'bg-neutral-700'
                      : 'bg-neutral-300'
                }`}
                aria-hidden
              />
              {statusLabel[item.status]}
            </span>
          )}

          {/*
            스터디에서 온 책임을 표지 위에서 바로 알아보게 한다 — 내 서재에는 혼자 담은 책과
            여러 스터디의 책이 섞여 꽂히므로, "어느" 스터디인지까지 있어야 표시가 뜻을 갖는다.
            칸이 좁아 이름은 잘리니 전체 이름은 title 로 남긴다.
          */}
          {item.source && (
            <span
              title={item.source}
              className="absolute bottom-2 left-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1 rounded-full bg-white/88 px-2 py-1 text-[10px] font-medium text-neutral-700 ring-1 ring-neutral-950/[0.06] backdrop-blur-sm"
            >
              <Users aria-hidden className="size-3 flex-none text-neutral-500" strokeWidth={2} />
              <span className="truncate">{item.source}</span>
            </span>
          )}

          {shownRank && (
            <RankSticker rank={shownRank} size="sm" className="top-2 left-2 -rotate-6" />
          )}
        </div>

        <div className="mt-3 min-w-0">
          <h3 className="truncate text-sm font-medium text-neutral-900">{item.title}</h3>
          {/* 부제 줄은 저자까지만 — 연도는 호버 카드에서 본다 */}
          <p className="mt-0.5 truncate text-xs text-neutral-500">
            {/* 번호만 tabular-nums 로 — 이름까지 걸면 한글 옆 라틴 글자 폭이 어긋난다 */}
            {order !== undefined && (
              <span className="tabular-nums">{String(order).padStart(2, '0')}</span>
            )}
            {order !== undefined && item.author && ' · '}
            {item.author}
          </p>
        </div>
      </Link>

      <WorkTooltip item={item} users={users} anchor={longPress.anchor} open={longPress.open} />
    </li>
  )
}
