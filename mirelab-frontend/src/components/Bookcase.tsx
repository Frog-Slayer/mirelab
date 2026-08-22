import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import Cover from '@/components/Cover'
import PickNote from '@/components/PickNote'
import Stars from '@/components/Stars'
import { formatRating } from '@/lib/format'
import type { User } from '@/types'
import { WorkKind, WorkStatus } from '@/types'

export type BookcaseFilter = 'ALL' | WorkStatus

export interface BookcaseItem {
  id: string
  title: string
  author: string
  year: number
  kind: WorkKind
  status: WorkStatus
  href: string
  /**
   * 어디서 온 책인지 — 스터디 이름이면 스터디 책, `null`이면 혼자 담은 책.
   * `undefined`면 이 구분이 의미 없는 곳(명예의 전당 등)이라 표시를 안 한다.
   */
  source?: string | null
  /** 평점·고른 이유 — 있으면 호버 시 카드에 같이 보여준다 */
  average?: number
  voterCount?: number
  addedBy?: string
  reason?: string
  description?: string
  coverUrl?: string
  actors?: string[]
}

const statusLabel: Record<WorkStatus, string> = {
  [WorkStatus.CANDIDATE]: '후보',
  [WorkStatus.READING]: '읽는 중',
  [WorkStatus.DONE]: '완료',
}

const filterOptions: { value: BookcaseFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: WorkStatus.CANDIDATE, label: '후보' },
  { value: WorkStatus.READING, label: '읽는 중' },
  { value: WorkStatus.DONE, label: '완료' },
]

const spineColors = [
  { background: '#36594d', color: '#f4f7f5' },
  { background: '#9d594f', color: '#fff8f5' },
  { background: '#4d6380', color: '#f5f7fb' },
  { background: '#c59d43', color: '#302710' },
  { background: '#665272', color: '#faf6fc' },
  { background: '#d7d1c5', color: '#393630' },
  { background: '#34434e', color: '#f3f6f7' },
]

const ticketPalettes = [
  { paper: '#f1e4bc', panel: '#a6383d', ink: '#6f3135', text: '#f7eaca' },
  { paper: '#e5dcc3', panel: '#3e5a74', ink: '#263e52', text: '#f6f0df' },
  { paper: '#e7dfbf', panel: '#496b62', ink: '#2e4d46', text: '#f5f0dc' },
  { paper: '#ead8c1', panel: '#775263', ink: '#512f3f', text: '#f9e9e5' },
  { paper: '#eee0b9', panel: '#98713a', ink: '#634719', text: '#fff3cf' },
]

const ticketRotations = ['-rotate-2', '-rotate-1', '', 'rotate-1', 'rotate-2']

export function BookcaseStatusFilters({
  value,
  items,
  onChange,
}: {
  value: BookcaseFilter
  items: Pick<BookcaseItem, 'status'>[]
  onChange: (value: BookcaseFilter) => void
}) {
  const count = (filter: BookcaseFilter) =>
    filter === 'ALL' ? items.length : items.filter((item) => item.status === filter).length

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="작품 상태 필터">
      {filterOptions.map((option) => {
        const selected = value === option.value

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none ${
              selected
                ? 'border-neutral-800 bg-neutral-900 text-white'
                : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400 hover:text-neutral-900'
            }`}
          >
            {option.value !== 'ALL' && <StatusGlyph status={option.value} inverted={selected} />}
            <span>{option.label}</span>
            <span className={selected ? 'text-neutral-300' : 'text-neutral-400'}>
              {count(option.value)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function Bookcase({
  completed,
  others,
  users = [],
  onActivate,
  onAdd,
}: {
  /** 완료된 작품 — 위 칸을 차지한다. 별점순 정렬은 부르는 쪽 책임 */
  completed: BookcaseItem[]
  /** 읽는 중 · 후보 — 완료작과 칸을 나눠 아래에 둔다 */
  others: BookcaseItem[]
  /** 호버 카드에서 "누가 골랐는지" 를 보여주려면 필요 */
  users?: User[]
  onActivate?: (id: string) => void
  /** 있으면 읽는 중·후보 칸 맨 끝에 "+"를 두어 책 추가 모달을 띄운다 */
  onAdd?: () => void
}) {
  const hasCompleted = completed.length > 0
  const hasOthers = others.length > 0 || !!onAdd
  const empty = !hasCompleted && !hasOthers

  return (
    <section
      aria-label="책장"
      className="rounded-xl border-8 border-[#71543d] bg-[#a89b8c] shadow-[inset_0_0_20px_rgba(56,40,27,0.24),0_8px_22px_rgba(38,31,24,0.14)]"
    >
      {empty ? (
        <ShelfCompartment>
          <EmptySlot onAdd={onAdd} />
        </ShelfCompartment>
      ) : (
        <>
          {hasCompleted && (
            <ShelfCompartment>
              {completed.map((item) => (
                <BookDisplay key={item.id} item={item} users={users} onActivate={onActivate} />
              ))}
            </ShelfCompartment>
          )}
          {hasCompleted && hasOthers && <div className="h-3 bg-[#6f5139]" aria-hidden />}
          {hasOthers && (
            <ShelfCompartment>
              {others.map((item) => (
                <BookDisplay key={item.id} item={item} users={users} onActivate={onActivate} />
              ))}
              {onAdd && <EmptySlot onAdd={onAdd} />}
            </ShelfCompartment>
          )}
        </>
      )}
    </section>
  )
}

const PLANK_CLASS =
  'h-4 border-y border-[#5e4432] bg-[linear-gradient(#9a7450,#795637)] shadow-[0_6px_10px_rgba(42,29,19,0.25)]'

/**
 * 칸 하나 — 폭이 남는 한 줄을 최대한 채우고, 다 못 들어가면 자연스럽게 다음 줄로
 * 넘어간다. 줄바꿈이 실제로 몇 번 일어나는지는 미리 알 수 없어서(책마다 폭이 다르고
 * 화면 폭도 다르니), 렌더링된 위치를 재서 줄이 바뀐 지점마다 선반을 하나씩 끼워 넣는다.
 */
function ShelfCompartment({ children }: { children: React.ReactNode }) {
  const listRef = useRef<HTMLOListElement>(null)
  const [rowBreaks, setRowBreaks] = useState<number[]>([])

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return

    const measure = () => {
      const items = Array.from(list.children) as HTMLElement[]
      // items-end 로 바닥을 맞추므로, 같은 줄이면 아래쪽 끝(offsetTop+offsetHeight)이 같다.
      const rowBottoms = [...new Set(items.map((item) => item.offsetTop + item.offsetHeight))].sort(
        (a, b) => a - b,
      )
      // 마지막 줄 아래는 칸 자체의 선반이 이미 있으니 그 앞줄들만 선반을 추가한다.
      setRowBreaks(rowBottoms.slice(0, -1))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="relative">
      <ol
        ref={listRef}
        className="flex min-h-56 flex-wrap items-end gap-x-2.5 gap-y-6 bg-[#a89b8c] bg-[linear-gradient(90deg,rgba(54,35,21,0.1)_1px,transparent_1px)] bg-size-[14px_14px] px-5 pt-7 pb-1.5"
      >
        {children}
      </ol>
      {rowBreaks.map((bottom) => (
        <div
          key={bottom}
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 ${PLANK_CLASS}`}
          style={{ top: bottom + 4 }}
        />
      ))}
      <div className={PLANK_CLASS} />
    </div>
  )
}

/**
 * 보여줄 게 없을 때도 빈 책장이 아니라 빈 칸 하나가 꽂힌 책장으로 보여준다.
 * onAdd 가 있으면 그 칸 자체가 "+" 버튼이 되어 책을 추가할 수 있다.
 */
function EmptySlot({ onAdd }: { onAdd?: () => void }) {
  if (onAdd) {
    return (
      <li>
        <button
          type="button"
          onClick={onAdd}
          aria-label="책 추가하기"
          title="책 추가하기"
          className="group relative flex h-40 w-24 origin-bottom cursor-pointer items-center justify-center overflow-hidden rounded-r-md rounded-l-sm border border-neutral-200 bg-white text-neutral-400 shadow-[3px_3px_5px_rgba(0,0,0,0.18)] transition duration-200 hover:z-[1] hover:-translate-y-2 hover:border-neutral-300 hover:shadow-[5px_8px_12px_rgba(0,0,0,0.2)] focus-visible:z-[1] focus-visible:-translate-y-2 focus-visible:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:outline-none"
        >
          <span className="absolute inset-y-0 left-2 w-px bg-neutral-200" aria-hidden />
          <span className="text-2xl leading-none transition-transform group-hover:scale-110 group-focus-visible:scale-110">
            <span aria-hidden>+</span>
          </span>
        </button>
      </li>
    )
  }

  const cls =
    'flex w-10 flex-none items-center justify-center rounded-t-[3px] border border-dashed text-lg'

  return (
    <li>
      <span className="sr-only">표시할 작품이 없습니다</span>
      <div aria-hidden className={`${cls} border-black/20 text-black/25`} style={{ height: 150 }}>
        —
      </div>
    </li>
  )
}

export function StatusGlyph({
  status,
  inverted = false,
}: {
  status: WorkStatus
  inverted?: boolean
}) {
  if (status === WorkStatus.READING) {
    return (
      <span
        className="h-4 w-2.5 shrink-0 bg-emerald-400 [clip-path:polygon(0_0,100%_0,100%_100%,50%_72%,0_100%)]"
        aria-hidden
      />
    )
  }

  if (status === WorkStatus.DONE) {
    return (
      <span
        className={`grid size-4 shrink-0 place-items-center rounded-full text-[11px] leading-none font-bold ${
          inverted ? 'bg-white text-neutral-900' : 'bg-neutral-800 text-white'
        }`}
        aria-hidden
      >
        ✓
      </span>
    )
  }

  return (
    <span
      className={`size-3.5 shrink-0 rounded-full border-2 ${inverted ? 'border-white' : 'border-neutral-400'}`}
      aria-hidden
    />
  )
}

function BookDisplay({
  item,
  users,
  onActivate,
}: {
  item: BookcaseItem
  users: User[]
  onActivate?: (id: string) => void
}) {
  if (item.kind === WorkKind.MOVIE) {
    return <MovieTicket item={item} users={users} onActivate={onActivate} />
  }

  return <BookCover item={item} users={users} onActivate={onActivate} />
}

function MovieTicket({
  item,
  users,
  onActivate,
}: {
  item: BookcaseItem
  users: User[]
  onActivate?: (id: string) => void
}) {
  const hash = hashTitle(item.title)
  const palette = ticketPalettes[hash % ticketPalettes.length]
  const rotation = ticketRotations[hash % ticketRotations.length]
  // 포스터가 있어도 일반 티켓과 비슷한 덩치를 유지하되, 포스터 면과 스텁을 함께 감싼다.
  const posterWidth = 88 + (hash % 8)
  const ticketWidth = item.coverUrl ? posterWidth + 16 : 96
  const ticketHeight = item.coverUrl ? Math.round(posterWidth * 1.5) + 72 : 192

  return (
    <li className="group/ticket relative">
      <Link
        to={item.href}
        onMouseEnter={() => onActivate?.(item.id)}
        onFocus={() => onActivate?.(item.id)}
        onTouchStart={() => onActivate?.(item.id)}
        aria-label={`${item.title}, ${item.author}, 영화, ${statusLabel[item.status]}`}
        className={`relative flex origin-bottom flex-col justify-between overflow-hidden p-2 shadow-[3px_3px_5px_rgba(0,0,0,0.22)] transition duration-200 hover:z-[1] hover:-translate-y-2 hover:rotate-0 hover:shadow-[5px_8px_12px_rgba(0,0,0,0.24)] focus-visible:z-[1] focus-visible:-translate-y-2 focus-visible:rotate-0 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none ${rotation}`}
        style={{
          width: ticketWidth,
          height: ticketHeight,
          backgroundColor: palette.paper,
          color: palette.text,
          clipPath:
            'polygon(5px 0, 12% 3px, 24% 0, 36% 3px, 48% 0, 60% 3px, 72% 0, 84% 3px, calc(100% - 5px) 0, 100% 5px, calc(100% - 3px) 12%, 100% 24%, calc(100% - 3px) 36%, 100% 48%, calc(100% - 3px) 60%, 100% 72%, calc(100% - 3px) 84%, 100% calc(100% - 5px), calc(100% - 5px) 100%, 88% calc(100% - 3px), 76% 100%, 64% calc(100% - 3px), 52% 100%, 40% calc(100% - 3px), 28% 100%, 16% calc(100% - 3px), 5px 100%, 0 calc(100% - 5px), 3px 88%, 0 76%, 3px 64%, 0 52%, 3px 40%, 0 28%, 3px 16%, 0 5px)',
          filter: 'drop-shadow(4px 6px 5px rgba(42, 29, 19, 0.34))',
        }}
      >
        <div
          className={`relative flex border-2 ${item.coverUrl ? 'min-h-0 flex-1 flex-col overflow-hidden' : 'min-h-0 flex-1 flex-col justify-between p-2.5'}`}
          style={{ backgroundColor: palette.panel, borderColor: palette.text }}
        >
          {item.coverUrl ? (
            <>
              <div className="flex h-5 shrink-0 items-center justify-between px-2">
                <span className="text-[8px] font-bold tracking-[0.14em]">ADMIT ONE</span>
                <span
                  className="grid size-4 place-items-center rounded-full shadow-sm"
                  style={{ backgroundColor: palette.text }}
                >
                  <StatusGlyph status={item.status} />
                </span>
              </div>
              <Cover
                work={item}
                size="lg"
                className="min-h-0 flex-1 !aspect-auto rounded-none border-0 object-contain"
              />
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[8px] font-bold tracking-[0.14em]">ADMIT ONE</span>
                <span
                  className="grid size-4 place-items-center rounded-full"
                  style={{ backgroundColor: palette.text }}
                >
                  <StatusGlyph status={item.status} />
                </span>
              </div>
              <span className="break-all text-sm leading-tight font-semibold">{item.title}</span>
              <span className="truncate text-[10px] opacity-75">{item.author || '미상'}</span>
            </>
          )}
        </div>
        <div
          className="flex h-9 shrink-0 items-center justify-between px-1"
          style={{ color: palette.ink }}
        >
          <span className="h-4 w-11 bg-[repeating-linear-gradient(90deg,currentColor_0_2px,transparent_2px_3px,currentColor_3px_4px,transparent_4px_6px)] opacity-75" />
          <span className="text-[8px] tabular-nums">{item.year}</span>
        </div>
      </Link>

      <BookPreview item={item} users={users} group="ticket" />
    </li>
  )
}

function BookCover({
  item,
  users,
  onActivate,
}: {
  item: BookcaseItem
  users: User[]
  onActivate?: (id: string) => void
}) {
  const hash = hashTitle(item.title)
  // 실제 표지는 폭만 정하고 이미지 자체의 원본 비율을 따른다.
  // 텍스트 표지는 조금 낮게 잡아 가판대가 지나치게 우뚝해 보이지 않게 한다.
  const height = 168 + (hash % 14)
  const width = item.coverUrl ? 110 + (hash % 10) : 96 + (hash % 12)
  const lean = hash % 5 === 0 ? '-rotate-2' : hash % 7 === 0 ? 'rotate-1' : ''
  const palette = spineColors[hash % spineColors.length]
  const titleSize = item.title.length > 34 ? 10 : item.title.length > 22 ? 11 : 13

  return (
    <li className="group/cover relative">
      <Link
        to={item.href}
        onMouseEnter={() => onActivate?.(item.id)}
        onFocus={() => onActivate?.(item.id)}
        onTouchStart={() => onActivate?.(item.id)}
        aria-label={`${item.title}, ${item.author}, ${statusLabel[item.status]}${
          item.source !== undefined ? `, ${item.source ?? '혼자 읽음'}` : ''
        }`}
        className={`relative block origin-bottom overflow-hidden rounded-t-sm border border-black/25 bg-white shadow-[3px_3px_5px_rgba(0,0,0,0.24),inset_3px_0_rgba(255,255,255,0.35)] transition duration-200 hover:z-[1] hover:-translate-y-2 hover:rotate-0 hover:shadow-[5px_8px_12px_rgba(0,0,0,0.28)] focus-visible:z-[1] focus-visible:-translate-y-2 focus-visible:rotate-0 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none ${lean}`}
        style={item.coverUrl ? { width } : { height, width }}
      >
        {item.coverUrl ? (
          <Cover
            work={item}
            size="lg"
            className="h-auto w-full !aspect-auto rounded-none border-0 bg-white"
          />
        ) : (
          <div
            className="flex h-full w-full flex-col justify-between p-3.5"
            style={{ backgroundColor: palette.background, color: palette.color }}
          >
            <span className="h-px w-7 bg-current opacity-60" aria-hidden />
            <span
              className="break-all leading-[1.35] font-semibold"
              style={{ fontSize: titleSize }}
            >
              {item.title}
            </span>
            <span className="text-[9px] leading-tight opacity-75">
              {item.author || '작자 미상'}
            </span>
          </div>
        )}
        <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-white/90 shadow-sm">
          <StatusGlyph status={item.status} />
        </span>
      </Link>

      <BookPreview item={item} users={users} group="cover" />
    </li>
  )
}

function BookPreview({
  item,
  users,
  group,
}: {
  item: BookcaseItem
  users: User[]
  group: 'cover' | 'ticket'
}) {
  // Tailwind가 hover 변형을 빌드할 수 있도록 클래스 이름은 정적으로 둔다.
  const visibilityClass =
    group === 'ticket'
      ? 'group-hover/ticket:visible group-hover/ticket:opacity-100 group-focus-within/ticket:visible group-focus-within/ticket:opacity-100'
      : 'group-hover/cover:visible group-hover/cover:opacity-100 group-focus-within/cover:visible group-focus-within/cover:opacity-100'

  return (
    <div
      className={`pointer-events-none invisible absolute bottom-full left-1/2 z-20 mb-2 w-72 -translate-x-1/2 opacity-0 transition-opacity duration-150 ${visibilityClass}`}
    >
      <div className="flex items-center gap-5 rounded-lg border border-neutral-200 bg-white p-4 text-left shadow-lg">
        <div className="w-10 flex-none">
          <Cover work={item} size="sm" />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-sm font-semibold text-neutral-900">{item.title}</span>
          <span className="text-xs text-neutral-500">
            {item.author} · {item.year}
          </span>
          {!!item.voterCount && (
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold tabular-nums text-neutral-900">
                {formatRating(item.average ?? 0)}
              </span>
              <Stars value={item.average ?? 0} size="sm" />
            </div>
          )}
          {item.description && (
            <p className="line-clamp-2 text-xs text-neutral-600">{item.description}</p>
          )}
          <PickNote addedBy={item.addedBy} reason={item.reason} users={users} truncate={false} />
        </div>
      </div>
    </div>
  )
}

function hashTitle(title: string) {
  return [...title].reduce((sum, char) => sum + char.charCodeAt(0), 0)
}
