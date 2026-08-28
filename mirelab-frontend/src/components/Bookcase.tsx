import { Plus } from 'lucide-react'
import { Link } from 'react-router'
import Cover from '@/components/Cover'
import PickNote from '@/components/PickNote'
import RankSticker from '@/components/RankSticker'
import Stars from '@/components/Stars'
import { useLongPressPreview } from '@/hooks/useLongPressPreview'
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
  source?: string | null
  average?: number
  voterCount?: number
  publishedRatings?: number[]
  addedBy?: string
  reason?: string
  description?: string
  coverUrl?: string
  actors?: string[]
  rank?: number
  finishedAt?: string | null
}

const statusLabel: Record<WorkStatus, string> = {
  [WorkStatus.CANDIDATE]: '후보',
  [WorkStatus.READING]: '읽는 중',
  [WorkStatus.DONE]: '완료',
}

const kindLabel: Record<WorkKind, string> = {
  [WorkKind.BOOK]: 'Book',
  [WorkKind.MOVIE]: 'Film',
  [WorkKind.GAME]: 'Game',
}

const placeholderTone: Record<WorkKind, string> = {
  [WorkKind.BOOK]: 'bg-[#dfe9e5] text-[#24443a]',
  [WorkKind.MOVIE]: 'bg-[#e3e7ed] text-[#303946]',
  [WorkKind.GAME]: 'bg-[#e2e8ec] text-[#293943]',
}

const filterOptions: { value: BookcaseFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: WorkStatus.CANDIDATE, label: '후보' },
  { value: WorkStatus.READING, label: '읽는 중' },
  { value: WorkStatus.DONE, label: '완료' },
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
    <div
      className="flex w-fit flex-wrap items-center gap-1 rounded-full bg-neutral-100 p-1"
      aria-label="작품 상태 필터"
    >
      {filterOptions.map((option) => {
        const selected = value === option.value

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none ${
              selected
                ? 'bg-white font-medium text-neutral-900 ring-1 ring-neutral-950/[0.06]'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <span>{option.label}</span>
            <span className="text-xs tabular-nums text-neutral-400">{count(option.value)}</span>
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
  completed: BookcaseItem[]
  others: BookcaseItem[]
  users?: User[]
  onActivate?: (id: string) => void
  onAdd?: () => void
}) {
  if (completed.length === 0 && others.length === 0) {
    return (
      <Collection title="컬렉션" count={0}>
        {onAdd ? <AddItem onAdd={onAdd} /> : <EmptyCollection />}
      </Collection>
    )
  }

  return (
    <section aria-label="작품 컬렉션" className="flex flex-col gap-12">
      {completed.length > 0 && (
        <Collection title="읽은 작품" count={completed.length}>
          {completed.map((item) => (
            <CollectionItem key={item.id} item={item} users={users} onActivate={onActivate} />
          ))}
        </Collection>
      )}

      {(others.length > 0 || onAdd) && (
        <Collection title="읽고 있거나 다음에 볼 작품" count={others.length}>
          {others.map((item) => (
            <CollectionItem key={item.id} item={item} users={users} onActivate={onActivate} />
          ))}
          {onAdd && <AddItem onAdd={onAdd} />}
        </Collection>
      )}
    </section>
  )
}

function Collection({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-neutral-800">{title}</h2>
        <span className="text-xs tabular-nums text-neutral-400">{count}</span>
        <span className="h-px flex-1 bg-neutral-200/80" aria-hidden />
      </div>
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(7.25rem,1fr))] gap-x-4 gap-y-8 sm:gap-x-5">
        {children}
      </ol>
    </section>
  )
}

function CollectionItem({
  item,
  users,
  onActivate,
}: {
  item: BookcaseItem
  users: User[]
  onActivate?: (id: string) => void
}) {
  const longPress = useLongPressPreview(() => onActivate?.(item.id))

  return (
    <li className="group/item relative min-w-0">
      <Link
        to={item.href}
        {...longPress.handlers}
        onMouseEnter={() => onActivate?.(item.id)}
        onFocus={() => onActivate?.(item.id)}
        className="block focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-3 focus-visible:outline-none"
        aria-label={`${item.title}, ${item.author}, ${statusLabel[item.status]}`}
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-neutral-100 ring-1 ring-neutral-950/10 transition-transform duration-200 group-hover/item:-translate-y-1">
          {item.coverUrl ? (
            <Cover work={item} size="lg" className="h-full w-full rounded-lg object-cover" />
          ) : (
            <div
              className={`flex h-full flex-col justify-between p-4 ${placeholderTone[item.kind]}`}
            >
              <span className="text-[10px] font-semibold tracking-[0.16em] uppercase opacity-55">
                {kindLabel[item.kind]}
              </span>
              <span className="line-clamp-5 text-base leading-snug font-semibold tracking-tight">
                {item.title}
              </span>
              <span className="truncate text-[10px] opacity-60">{item.author || '작자 미상'}</span>
            </div>
          )}

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

          {item.rank && item.rank <= 3 && (
            <RankSticker
              rank={item.rank as 1 | 2 | 3}
              size="sm"
              className="top-2 left-2 -rotate-6"
            />
          )}
        </div>

        <div className="mt-3 min-w-0">
          <h3 className="truncate text-sm font-medium text-neutral-900">{item.title}</h3>
          <p className="mt-0.5 truncate text-xs text-neutral-500">
            {[item.author, item.year || null].filter(Boolean).join(' · ')}
          </p>
        </div>
      </Link>

      <BookPreview item={item} users={users} mobileOpen={longPress.open} />
    </li>
  )
}

function AddItem({ onAdd }: { onAdd: () => void }) {
  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={onAdd}
        className="group flex w-full cursor-pointer flex-col text-left focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-3 focus-visible:outline-none"
      >
        <span className="grid aspect-[2/3] w-full place-items-center rounded-lg border border-dashed border-neutral-300 bg-white/45 text-neutral-400 transition-colors group-hover:border-neutral-400 group-hover:bg-white group-hover:text-neutral-700">
          <Plus aria-hidden className="size-5" strokeWidth={1.5} />
        </span>
        <span className="mt-3 text-sm font-medium text-neutral-500 group-hover:text-neutral-800">
          작품 추가
        </span>
      </button>
    </li>
  )
}

function EmptyCollection() {
  return (
    <li className="col-span-full rounded-xl bg-neutral-100/70 px-5 py-10 text-center text-sm text-neutral-500">
      아직 담긴 작품이 없습니다.
    </li>
  )
}

function BookPreview({
  item,
  users,
  mobileOpen,
}: {
  item: BookcaseItem
  users: User[]
  mobileOpen: boolean
}) {
  return (
    <div
      className={`pointer-events-none absolute bottom-full left-1/2 z-20 mb-3 w-72 -translate-x-1/2 transition-opacity duration-150 ${
        mobileOpen
          ? 'visible opacity-100'
          : 'invisible opacity-0 group-hover/item:visible group-hover/item:opacity-100 group-focus-within/item:visible group-focus-within/item:opacity-100'
      }`}
    >
      <div className="app-tile flex items-center gap-5 p-4 text-left shadow-md">
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
