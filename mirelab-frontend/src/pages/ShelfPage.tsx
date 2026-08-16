import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookcase, BookcaseStatusFilters, type BookcaseFilter } from '@/components/Bookcase'
import Cover from '@/components/Cover'
import Stars from '@/components/Stars'
import { useCurrentUser } from '@/hooks/currentUser'
import { addPersonalWork, getShelf, type ShelfEntry } from '@/mocks/api'
import { formatRating } from '@/lib/format'
import type { SlotDef } from '@/types'
import { SlotType, WorkKind, WorkStatus } from '@/types'

const statusLabel: Record<string, string> = {
  [WorkStatus.CANDIDATE]: '후보',
  [WorkStatus.READING]: '읽는 중',
  [WorkStatus.DONE]: '완료',
}

const columns = [
  { status: WorkStatus.CANDIDATE, label: '후보', hint: '읽고 싶은 것' },
  { status: WorkStatus.READING, label: '읽는 중', hint: '지금 읽는 것' },
  { status: WorkStatus.DONE, label: '완료', hint: '다 읽은 것' },
] as const

type ShelfView = 'SHELF' | 'BOARD'

/**
 * 내 서재 — 내 책 목록. 여기서는 보기만 하고, 쓰는 건 상세에서 한다.
 */
export default function ShelfPage() {
  const { user } = useCurrentUser()
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [filter, setFilter] = useState<BookcaseFilter>('ALL')
  const [view, setView] = useState<ShelfView>('SHELF')

  const { data: shelf } = useQuery({
    queryKey: ['shelf', user?.id],
    queryFn: () => getShelf(user!.id),
    enabled: !!user,
  })

  const create = useMutation({
    mutationFn: addPersonalWork,
    onSuccess: () => qc.invalidateQueries(),
  })

  if (!user || !shelf) return <p className="text-sm text-neutral-400">불러오는 중…</p>

  const { slots, entries } = shelf
  const ratingSlot = slots.find((s) => s.type === SlotType.RATING)

  const myRating = (entry: ShelfEntry) => {
    const v = entry.values.find((x) => x.slotDefId === ratingSlot?.id)
    return v && 'n' in v.value ? v.value.n : null
  }

  // 내가 매긴 점수 순. 아직 안 매긴 책은 뒤로 민다
  const sorted = [...entries].sort((a, b) => (myRating(b) ?? -1) - (myRating(a) ?? -1))
  const blurbSlot = slots.find((s) => s.type === SlotType.TEXT_SHORT)
  const displayEntries = sorted.map((entry) => ({
    entry,
    rating: myRating(entry),
    blurb: textValue(entry, blurbSlot),
  }))
  const filteredEntries =
    filter === 'ALL'
      ? displayEntries
      : displayEntries.filter((item) => item.entry.work.status === filter)
  const active =
    filteredEntries.find((item) => item.entry.work.id === activeId) ?? filteredEntries[0]
  const rated = entries.filter((e) => myRating(e) !== null)
  const average = rated.length
    ? rated.reduce((sum, e) => sum + (myRating(e) ?? 0), 0) / rated.length
    : 0

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-neutral-200 pb-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">내 서재</h1>
          <p className="text-sm text-neutral-500">
            {entries.length}권 · 내가 매긴 {rated.length}권 평균 ★ {formatRating(average)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle value={view} onChange={setView} />
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="app-button app-button-primary"
          >
            책 담기
          </button>
        </div>
      </div>

      {adding && (
        <AddDialog
          onClose={() => setAdding(false)}
          onSubmit={(input) => {
            create.mutate({ ...input, ownerId: user.id })
            setAdding(false)
          }}
        />
      )}

      {displayEntries.length > 0 &&
        (view === 'SHELF' ? (
          <>
            <BookcaseStatusFilters
              value={filter}
              items={displayEntries.map(({ entry }) => ({ status: entry.work.status }))}
              onChange={setFilter}
            />
            {filteredEntries.length > 0 ? (
              <Bookcase
                items={filteredEntries.map(({ entry }) => ({
                  id: entry.work.id,
                  title: entry.work.title,
                  author: entry.work.author,
                  status: entry.work.status,
                  href: `/shelf/${entry.work.id}`,
                }))}
                onActivate={setActiveId}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-neutral-300 px-5 py-12 text-center text-sm text-neutral-500">
                이 상태의 책이 없습니다.
              </div>
            )}
            {active && <ActiveBook item={active} />}
          </>
        ) : (
          <ShelfBoard items={displayEntries} />
        ))}

      {entries.length === 0 && <p className="text-sm text-neutral-400">아직 담은 책이 없습니다.</p>}
    </div>
  )
}

interface DisplayEntry {
  entry: ShelfEntry
  rating: number | null
  blurb: string
}

function textValue(entry: ShelfEntry, slot?: SlotDef) {
  const value = entry.values.find((item) => item.slotDefId === slot?.id)
  return value && 'text' in value.value ? value.value.text : ''
}

function ViewToggle({
  value,
  onChange,
}: {
  value: ShelfView
  onChange: (value: ShelfView) => void
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-neutral-200 bg-neutral-100 p-1"
      aria-label="내 서재 보기 방식"
    >
      {(
        [
          ['SHELF', '책장'],
          ['BOARD', '칸반'],
        ] as const
      ).map(([option, label]) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={`min-h-9 rounded-md px-3 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none ${
            value === option
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** 읽는 상태별로 늘어놓는 보기. 칸 안은 내가 매긴 점수 순 */
function ShelfBoard({ items }: { items: DisplayEntry[] }) {
  return (
    <div className="grid gap-8 md:grid-cols-3 md:gap-5">
      {columns.map(({ status, label, hint }) => {
        const inColumn = items.filter((item) => item.entry.work.status === status)
        return (
          <section key={status} className="flex flex-col gap-4">
            <div className="flex items-baseline gap-2 border-b border-neutral-200 pb-3">
              <h2 className="text-sm font-semibold">{label}</h2>
              <span className="text-xs text-neutral-400 tabular-nums">{inColumn.length}</span>
              <span className="ml-auto text-xs text-neutral-400">{hint}</span>
            </div>

            {inColumn.length === 0 && <p className="py-5 text-sm text-neutral-400">비어 있음</p>}

            {inColumn.map((item) => (
              <BoardCard key={item.entry.work.id} item={item} />
            ))}
          </section>
        )
      })}
    </div>
  )
}

function BoardCard({ item }: { item: DisplayEntry }) {
  const { work, study } = item.entry

  return (
    <Link
      to={`/shelf/${work.id}`}
      className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-emerald-300"
    >
      <div className="flex gap-4">
        <Cover work={work} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-sm leading-tight font-semibold">{work.title}</span>
          <span className="truncate text-xs text-neutral-500">{work.author}</span>
          <span className="truncate text-xs text-neutral-400">{study?.name ?? '혼자 읽음'}</span>
        </div>
      </div>

      {item.rating === null ? (
        <span className="text-xs text-neutral-400">아직 평가하지 않음</span>
      ) : (
        <div className="flex items-center gap-2">
          <Stars value={item.rating} size="sm" />
          <span className="text-sm font-semibold tabular-nums">{item.rating.toFixed(1)}</span>
        </div>
      )}

      {item.blurb && <p className="line-clamp-2 text-xs text-neutral-600">{item.blurb}</p>}
    </Link>
  )
}

function ActiveBook({ item }: { item: DisplayEntry }) {
  const { work, study } = item.entry

  return (
    <div className="grid gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <Cover work={work} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{work.title}</h2>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
            {statusLabel[work.status]}
          </span>
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          {work.author} · {study?.name ?? '혼자 읽음'}
        </p>
        {item.blurb && <p className="mt-2 text-sm text-neutral-700">{item.blurb}</p>}
      </div>
      <div className="flex items-center gap-2 sm:justify-self-end">
        {item.rating === null ? (
          <span className="text-sm text-neutral-400">아직 평가하지 않음</span>
        ) : (
          <>
            <Stars value={item.rating} size="sm" />
            <span className="text-lg font-semibold tabular-nums">{item.rating.toFixed(1)}</span>
          </>
        )}
      </div>
    </div>
  )
}

function AddDialog({
  onSubmit,
  onClose,
}: {
  onSubmit: (input: { kind: WorkKind; title: string; author: string }) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [kind, setKind] = useState<WorkKind>(WorkKind.BOOK)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close()
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-sm border border-neutral-200 p-0 backdrop:bg-neutral-900/30"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim()) return
          onSubmit({ kind, title: title.trim(), author: author.trim() })
        }}
        className="flex flex-col gap-3 p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-base font-semibold">내 서재에 담기</h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="app-button app-button-ghost app-icon-button"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as WorkKind)}
            className="cursor-pointer rounded-sm border border-neutral-200 px-2 py-2 text-sm text-neutral-700"
          >
            <option value={WorkKind.BOOK}>책</option>
            <option value={WorkKind.MOVIE}>영화</option>
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            className="min-w-40 flex-1 rounded-sm border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
          />
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder={kind === WorkKind.MOVIE ? '감독' : '저자'}
            className="min-w-32 rounded-sm border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
          />
          <button type="submit" className="app-button app-button-primary">
            담기
          </button>
        </div>

        <p className="text-xs text-neutral-500">
          스터디와 무관하게 혼자 읽는 책입니다. 스터디에서 읽은 책은 자동으로 들어옵니다.
        </p>
      </form>
    </dialog>
  )
}
