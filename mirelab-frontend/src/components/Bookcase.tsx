import { Plus } from 'lucide-react'
import { WorkTile, WorkTileGrid } from '@/components/WorkTile'
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
  onAdd,
}: {
  completed: BookcaseItem[]
  others: BookcaseItem[]
  users?: User[]
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
            <WorkTile key={item.id} item={item} users={users} />
          ))}
        </Collection>
      )}

      {(others.length > 0 || onAdd) && (
        <Collection title="읽고 있거나 다음에 볼 작품" count={others.length}>
          {others.map((item) => (
            <WorkTile key={item.id} item={item} users={users} />
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
      <WorkTileGrid>{children}</WorkTileGrid>
    </section>
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
