import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bookcase,
  BookcaseStatusFilters,
  type BookcaseFilter,
  type BookcaseItem,
} from '@/components/Bookcase'
import Cover from '@/components/Cover'
import Stars from '@/components/Stars'
import PickNote from '@/components/PickNote'
import { useCurrentUser } from '@/hooks/currentUser'
import { useStudy } from '@/hooks/useStudy'
import { addWork, getLibrary } from '@/mocks/api'
import type { LibraryEntry } from '@/mocks/api'
import { formatRating } from '@/lib/format'
import type { User } from '@/types'
import { WorkKind, WorkStatus } from '@/types'

const columns = [
  { status: WorkStatus.CANDIDATE, label: '후보', hint: '읽고 싶은 것' },
  { status: WorkStatus.READING, label: '읽는 중', hint: '모임이 진행 중' },
  { status: WorkStatus.DONE, label: '완료', hint: '별점이 확정된 것' },
] as const

type LibraryView = 'SHELF' | 'BOARD'

export default function LibraryPage() {
  const { user } = useCurrentUser()
  const { study, members } = useStudy()
  const qc = useQueryClient()

  const { data: works = [] } = useQuery({
    queryKey: ['library', study?.id],
    queryFn: () => getLibrary(study!.id),
    enabled: !!study,
  })

  const [adding, setAdding] = useState(false)
  const [view, setView] = useState<LibraryView>('SHELF')
  const [filter, setFilter] = useState<BookcaseFilter>('ALL')
  const [activeId, setActiveId] = useState<string | null>(null)

  const create = useMutation({ mutationFn: addWork, onSuccess: () => qc.invalidateQueries() })

  if (!user || !study) return null

  const bookcaseItems: BookcaseItem[] = works.map((work) => ({
    id: work.id,
    title: work.title,
    author: work.author,
    status: work.status,
    href: `/${study.slug}/books/${work.id}`,
  }))
  const filteredWorks = filter === 'ALL' ? works : works.filter((work) => work.status === filter)
  const filteredBookcaseItems = bookcaseItems.filter((item) =>
    filteredWorks.some((work) => work.id === item.id),
  )
  const activeWork = filteredWorks.find((work) => work.id === activeId) ?? filteredWorks[0]

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-neutral-200 pb-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">작품</h1>
          <p className="text-sm text-neutral-500">
            함께 읽을 후보부터 완료한 작품까지 한곳에서 봅니다. 완료 작품의 순위는 명예의 전당에
            남습니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle value={view} onChange={setView} />
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="app-button app-button-primary"
          >
            추가하기
          </button>
        </div>
      </div>

      {adding && (
        <AddDialog
          onClose={() => setAdding(false)}
          onSubmit={(input) => {
            create.mutate({ ...input, studyId: study.id, addedBy: user.id })
            setAdding(false)
          }}
        />
      )}

      {view === 'SHELF' ? (
        <div className="flex flex-col gap-8">
          {works.length > 0 ? (
            <>
              <BookcaseStatusFilters value={filter} items={bookcaseItems} onChange={setFilter} />
              {filteredBookcaseItems.length > 0 ? (
                <Bookcase items={filteredBookcaseItems} onActivate={setActiveId} />
              ) : (
                <div className="rounded-xl border border-dashed border-neutral-300 px-5 py-12 text-center text-sm text-neutral-500">
                  이 상태의 작품이 없습니다.
                </div>
              )}
              {activeWork && <ActiveWork work={activeWork} slug={study.slug} users={members} />}
            </>
          ) : (
            <p className="text-sm text-neutral-400">아직 추가한 작품이 없습니다.</p>
          )}
        </div>
      ) : (
        <KanbanBoard works={works} slug={study.slug} users={members} />
      )}
    </div>
  )
}

function ViewToggle({
  value,
  onChange,
}: {
  value: LibraryView
  onChange: (value: LibraryView) => void
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-neutral-200 bg-neutral-100 p-1"
      aria-label="작품 보기 방식"
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

function KanbanBoard({
  works,
  slug,
  users,
}: {
  works: LibraryEntry[]
  slug: string
  users: User[]
}) {
  return (
    <div className="grid gap-8 md:grid-cols-3 md:gap-5">
      {columns.map(({ status, label, hint }) => {
        const items = works.filter((work) => work.status === status)
        return (
          <section key={status} className="flex flex-col gap-4">
            <div className="flex items-baseline gap-2 border-b border-neutral-200 pb-3">
              <h2 className="text-sm font-semibold">{label}</h2>
              <span className="text-xs text-neutral-400 tabular-nums">{items.length}</span>
              <span className="ml-auto text-xs text-neutral-400">{hint}</span>
            </div>

            {items.length === 0 && <p className="py-5 text-sm text-neutral-400">비어 있음</p>}

            {items.map((work) => (
              <WorkCard key={work.id} work={work} slug={slug} users={users} />
            ))}
          </section>
        )
      })}
    </div>
  )
}

function ActiveWork({ work, slug, users }: { work: LibraryEntry; slug: string; users: User[] }) {
  return (
    <div className="grid gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <Cover work={work} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{work.title}</h2>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
            {columns.find((column) => column.status === work.status)?.label}
          </span>
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          {work.author}
          {work.sessionCount > 0 && ` · 모임 ${work.sessionCount}번`}
        </p>
        <div className="mt-2">
          <PickNote addedBy={work.addedBy} reason={work.reason} users={users} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:flex-col sm:items-end">
        {work.status === WorkStatus.DONE && work.voterCount > 0 && (
          <div className="flex items-center gap-2">
            <Stars value={work.average} size="sm" />
            <span className="text-lg font-semibold tabular-nums">{formatRating(work.average)}</span>
          </div>
        )}
        <Link to={`/${slug}/books/${work.id}`} className="app-button app-button-secondary">
          상세 보기
        </Link>
      </div>
    </div>
  )
}

function WorkCard({ work, slug, users }: { work: LibraryEntry; slug: string; users: User[] }) {
  return (
    <Link
      to={`/${slug}/books/${work.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-emerald-300"
    >
      <div className="flex gap-4">
        <Cover work={work} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-sm leading-tight font-semibold">{work.title}</span>
          <span className="truncate text-xs text-neutral-500">{work.author}</span>
          <span className="text-xs text-neutral-400">
            {work.kind === WorkKind.MOVIE ? '영화' : '책'}
            {work.sessionCount > 0 && ` · 모임 ${work.sessionCount}번`}
          </span>
        </div>
      </div>

      {work.status === WorkStatus.DONE && work.voterCount > 0 && (
        <div className="flex items-center gap-2 pl-24">
          <Stars value={work.average} size="sm" />
          <span className="font-mono text-xs tabular-nums">{formatRating(work.average)}</span>
        </div>
      )}

      <PickNote addedBy={work.addedBy} reason={work.reason} users={users} />
    </Link>
  )
}

function AddDialog({
  onSubmit,
  onClose,
}: {
  onSubmit: (input: { kind: WorkKind; title: string; author: string; reason: string }) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const [kind, setKind] = useState<WorkKind>(WorkKind.BOOK)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [reason, setReason] = useState('')

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close()
      }}
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-sm border border-neutral-200 p-0 backdrop:bg-neutral-900/30"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim()) return
          onSubmit({ kind, title: title.trim(), author: author.trim(), reason: reason.trim() })
        }}
        className="flex flex-col gap-3 p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-base font-semibold">읽고 싶은 것 추가</h2>
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
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="왜 고르셨나요 — 작품 기록에 함께 남습니다"
            className="min-w-40 flex-1 rounded-sm border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
          />
          <button type="submit" className="app-button app-button-primary">
            후보로 담기
          </button>
        </div>
        <p className="text-xs text-neutral-500">
          나중에는 제목만 치면 알라딘 · TMDB 에서 표지와 저자가 따라옵니다.
        </p>
      </form>
    </dialog>
  )
}
