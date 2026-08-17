import { Link } from 'react-router'
import Cover from '@/components/Cover'
import PickNote from '@/components/PickNote'
import Stars from '@/components/Stars'
import { formatRating } from '@/lib/format'
import type { User, WorkKind } from '@/types'
import { WorkStatus } from '@/types'

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
  /** 있으면 others 칸 맨 끝이 "+" 로 바뀌어 책 추가 모달을 띄운다 */
  onAdd?: () => void
}) {
  const hasCompleted = completed.length > 0
  const hasOthers = others.length > 0 || !!onAdd
  const empty = !hasCompleted && !hasOthers

  return (
    <section
      aria-label="책장"
      className="rounded-xl border-8 border-[#71543d] bg-[#ddd7ce] shadow-[inset_0_0_20px_rgba(56,40,27,0.18),0_8px_22px_rgba(38,31,24,0.1)]"
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

/** 칸 하나 — 폭이 남는 한 줄을 최대한 채우고, 다 못 들어가면 자연스럽게 다음 줄로 넘어간다 */
function ShelfCompartment({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <ol className="flex min-h-56 flex-wrap items-end gap-2.5 bg-[linear-gradient(90deg,rgba(78,53,32,0.04)_1px,transparent_1px)] bg-size-[14px_14px] px-5 pt-7 pb-1.5">
        {children}
      </ol>
      <div className="h-4 border-y border-[#5e4432] bg-[linear-gradient(#9a7450,#795637)] shadow-[0_6px_10px_rgba(42,29,19,0.25)]" />
    </div>
  )
}

/**
 * 보여줄 게 없을 때도 빈 책장이 아니라 빈 칸 하나가 꽂힌 책장으로 보여준다.
 * onAdd 가 있으면 그 칸 자체가 "+" 버튼이 되어 책을 추가할 수 있다.
 */
function EmptySlot({ onAdd }: { onAdd?: () => void }) {
  const cls =
    'flex w-10 flex-none items-center justify-center rounded-t-[3px] border border-dashed text-lg'

  if (onAdd) {
    return (
      <li>
        <button
          type="button"
          onClick={onAdd}
          aria-label="책 추가하기"
          title="책 추가하기"
          className={`${cls} cursor-pointer border-black/25 text-black/35 transition-colors hover:border-emerald-600/50 hover:bg-black/5 hover:text-emerald-700`}
          style={{ height: 150 }}
        >
          +
        </button>
      </li>
    )
  }

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
  return <BookCover item={item} users={users} onActivate={onActivate} />
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
            <span className="text-[9px] leading-tight opacity-75">{item.author || '작자 미상'}</span>
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
  group: 'cover'
}) {
  return (
    <div
      className={`pointer-events-none invisible absolute bottom-full left-1/2 z-20 mb-2 w-72 -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover/${group}:visible group-hover/${group}:opacity-100 group-focus-within/${group}:visible group-focus-within/${group}:opacity-100`}
    >
      <div className="flex items-center gap-5 rounded-lg border border-neutral-200 bg-white p-4 text-left shadow-lg">
        <div className="w-10 flex-none">
          <Cover work={item} size="sm" />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="truncate text-sm font-semibold text-neutral-900">{item.title}</span>
          <span className="truncate text-xs text-neutral-500">
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
          {item.description && <p className="line-clamp-2 text-xs text-neutral-600">{item.description}</p>}
          <PickNote addedBy={item.addedBy} reason={item.reason} users={users} />
        </div>
      </div>
    </div>
  )
}

function hashTitle(title: string) {
  return [...title].reduce((sum, char) => sum + char.charCodeAt(0), 0)
}
