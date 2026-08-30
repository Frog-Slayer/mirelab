import { ChevronDown, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import BookLookupField from '@/components/BookLookupField'
import KindTag from '@/components/KindTag'
import PickNote from '@/components/PickNote'
import Stars from '@/components/Stars'
import { FloatingAction } from '@/components/layout/FloatingStack'
import WorkPreviewCard from '@/components/WorkPreviewCard'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import { useStudy } from '@/hooks/useStudy'
import { parseYearFromPubDate } from '@/lib/bookApi'
import { formatRating } from '@/lib/format'
import { addWork, getLibrary, type LibraryEntry } from '@/lib/workApi'
import { KIND_ORDER, kindIcon, kindLabel } from '@/lib/workKind'
import { STATUS_ORDER, statusLabel as workStatusLabel, type StatusFilter } from '@/lib/workStatus'
import type { User } from '@/types'
import { WorkKind, WorkStatus } from '@/types'

type Filter = 'ALL' | WorkKind

/** 주소의 ?status= 는 사람이 손으로 고칠 수 있으니, 모르는 값이면 조용히 '전체'로 떨어진다 */
function toStatusFilter(value: string | null): StatusFilter {
  return value === WorkStatus.CANDIDATE || value === WorkStatus.READING || value === WorkStatus.DONE
    ? value
    : 'ALL'
}

/**
 * 상태마다 줄 세우는 기준 날짜가 다르다 — 후보는 담긴 날, 진행 중은 시작한 날,
 * 완료는 끝난 날. "이 상태가 된 지 얼마나 됐나"가 각 묶음에서 궁금한 것이라서다.
 */
function recordedAt(work: LibraryEntry): string | null | undefined {
  if (work.status === WorkStatus.DONE) return work.finishedAt
  if (work.status === WorkStatus.READING) return work.startedAt
  return work.addedAt
}

/**
 * 최근 것이 위로. 날짜가 없는 작품(이 필드들이 생기기 전에 만들어진 것)은 언제인지 알 수
 * 없으니 있는 것들 뒤로 몰고, 그들끼리는 제목순으로 떨어지게 둔다 — 0 을 돌려 다음 기준으로
 * 넘긴다. 내림차순이라고 해서 "모르는 것"을 맨 앞에 두면 아무 근거 없이 제일 최근인 척이 된다.
 */
function byNewest(a: string | null | undefined, b: string | null | undefined): number {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return b.localeCompare(a)
}

type SortKey = 'recent' | 'rating'

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'recent', label: '최신순' },
  { key: 'rating', label: '평점순' },
]

/**
 * 평점순이어도 동점은 최신순으로 떨어뜨리고, 날짜마저 같으면(테스트 데이터처럼 날짜가 비어
 * 있는 경우) 제목 → id 순으로 가른다. 같은 목록을 두 번 그릴 때 순서가 흔들리지 않게.
 */
function compareWorks(a: LibraryEntry, b: LibraryEntry, sort: SortKey): number {
  if (sort === 'rating') {
    const byRating = b.average - a.average
    if (byRating !== 0) return byRating
  }

  const byDate = byNewest(recordedAt(a), recordedAt(b))
  if (byDate !== 0) return byDate

  const byTitle = a.title.localeCompare(b.title, 'ko')
  if (byTitle !== 0) return byTitle

  return a.id.localeCompare(b.id)
}

/* 목록에서 상태를 빠르게 훑을 수 있도록 완료·진행·후보를 서로 다른 옅은 색으로 구분한다. */
const statusBadgeClass = {
  [WorkStatus.DONE]: 'bg-emerald-50 text-emerald-700',
  [WorkStatus.READING]: 'bg-blue-50 text-blue-700',
  [WorkStatus.CANDIDATE]: 'bg-amber-50 text-amber-700',
} satisfies Record<LibraryEntry['status'], string>

function formatRecordedAt(value: string) {
  const date = new Date(value)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

export default function AllWorksPage() {
  const { study, members } = useStudy()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('ALL')
  const [sort, setSort] = useState<SortKey>('recent')
  /*
   * 상태만 주소에 남긴다 — 다른 화면에서 "후보만 보여줘"로 곧바로 건너올 수 있어야 하고
   * (홈의 '최근 추가된 작품 → 더보기'가 그 길로 온다), 그렇게 온 화면은 뒤로 가기로
   * 되돌려야 하기 때문이다. 종류·정렬·검색어는 이 화면에서만 쓰는 것이라 그대로 둔다.
   */
  const [searchParams, setSearchParams] = useSearchParams()
  const status = toStatusFilter(searchParams.get('status'))
  const setStatus = (next: StatusFilter) =>
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (next === 'ALL') params.delete('status')
        else params.set('status', next)
        return params
      },
      // 필터를 누르는 것은 새 화면으로 가는 것이 아니다 — 뒤로 가기가 필터 변경 이력을
      // 하나하나 되짚게 되면, 여기 오기 전 화면으로 돌아가는 데 여러 번 눌러야 한다.
      // 같은 이유로 스크롤도 그대로 둔다(ScrollRestoration 이 새 화면으로 보고 맨 위로
      // 올려버리면, 목록 중간에서 필터를 누를 때마다 화면이 튄다).
      { replace: true, preventScrollReset: true },
    )
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const { data: works = [], isPending } = useQuery({
    queryKey: ['library', study?.slug],
    queryFn: () => getLibrary(study!.slug),
    enabled: !!study,
  })
  const create = useMutation({
    mutationFn: addWork,
    onSuccess: (_, input) => queryClient.invalidateQueries({ queryKey: ['library', input.slug] }),
  })

  if (!study) return null

  const keyword = query.trim().toLowerCase()
  const matched = works
    .filter((work) => status === 'ALL' || work.status === status)
    .filter(
      (work) =>
        !keyword ||
        work.title.toLowerCase().includes(keyword) ||
        work.author.toLowerCase().includes(keyword),
    )
  const shown = matched
    .filter((work) => filter === 'ALL' || work.kind === filter)
    .sort((a, b) => compareWorks(a, b, sort))
  const narrowed = shown.length !== works.length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-semibold tracking-tight">작품 목록</h1>
          <p className="text-sm text-neutral-500">
            {narrowed
              ? `${shown.length}편 · 전체 ${works.length}편 중`
              : `진행 중인 책과 후보를 포함한 전체 ${works.length}편`}
          </p>
        </div>

        <label className="relative">
          <span className="sr-only">작품 검색</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="작품 제목, 저자, 감독 검색"
            className="w-64 rounded-full border border-neutral-200 py-2 pr-10 pl-4 text-sm outline-none focus:border-neutral-400"
          />
          <Search
            className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-neutral-400"
            aria-hidden
          />
        </label>
      </div>

      <FloatingAction>
        <button
          type="button"
          onClick={() => setAdding(true)}
          aria-label="작품 추가"
          title="작품 추가"
          className="grid size-14 cursor-pointer place-items-center rounded-full bg-[#245445] text-2xl leading-none text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#1d473a] focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
        >
          <span aria-hidden>+</span>
        </button>
      </FloatingAction>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <KindFilterChip
            active={filter === 'ALL'}
            label="전체"
            count={matched.length}
            onClick={() => setFilter('ALL')}
          />
          {KIND_ORDER.map((kind) => {
            const Icon = kindIcon[kind]

            return (
              <KindFilterChip
                key={kind}
                active={filter === kind}
                label={kindLabel[kind]}
                icon={<Icon className="size-4" aria-hidden />}
                count={matched.filter((work) => work.kind === kind).length}
                onClick={() => setFilter(kind)}
              />
            )
          })}

          {/*
            상태는 종류 옆에서 같이 걸리는 축이라 같은 줄에 둔다. 칩을 넉 개 더 늘리면 줄이
            길어지고 "전체" 라는 칩이 두 개 생겨(종류 전체·상태 전체) 서로 헷갈리므로,
            접어 두는 드롭다운으로 둔다 — 고른 값이 곧 이름표가 된다.
          */}
          <StatusFilterMenu value={status} onChange={setStatus} />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {sortOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setSort(option.key)}
              className={`cursor-pointer text-sm transition-colors ${
                sort === option.key
                  ? 'font-semibold text-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {adding && (
        <AddWorkDialog
          initialKind={filter === 'ALL' ? undefined : filter}
          onClose={() => setAdding(false)}
          onSubmit={(input) => {
            create.mutate({ ...input, slug: study.slug })
            setAdding(false)
          }}
        />
      )}

      {isPending ? (
        <p className="text-sm text-neutral-500">불러오는 중…</p>
      ) : (
        <WorkCardList works={shown} slug={study.slug} members={members} />
      )}
    </div>
  )
}

/**
 * 상태 필터. 종류 칩과 같은 줄에 서므로 닫혀 있을 때는 칩과 똑같이 보이고, 걸려 있으면
 * 고른 칩처럼 검게 뒤집힌다.
 *
 * 여닫기·바깥 누름·Esc·화면 경계에 맞춰 뒤집기·키보드 이동은 shadcn 의 DropdownMenu
 * (Radix)가 맡는다. 브라우저 기본 select 를 쓰지 않는 이유는 항목 목록을 OS 가 그려서
 * 이 화면의 다른 것들과 생김새가 따로 놀기 때문이다.
 */
function StatusFilterMenu({
  value,
  onChange,
}: {
  value: StatusFilter
  onChange: (next: StatusFilter) => void
}) {
  /*
   * 목록에서 찾는 순서는 진행 순서(후보→완료)의 반대다 — 쌓여 있는 건 완료작이고 먼저
   * 찾게 되는 것도 그쪽이다. STATUS_ORDER 를 뒤집어 쓰되 원본은 건드리지 않는다(모듈
   * 하나를 여럿이 가져다 쓰는 배열이라, 여기서 reverse 하면 다른 화면의 순서까지 뒤집힌다).
   */
  const options: StatusFilter[] = ['ALL', ...[...STATUS_ORDER].reverse()]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`group inline-flex cursor-pointer items-center gap-1.5 rounded-full border py-1.5 pr-2.5 pl-3.5 text-sm font-medium transition outline-none ${
          value === 'ALL'
            ? 'border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900'
            : 'border-neutral-900 bg-neutral-900 text-white'
        }`}
      >
        {value === 'ALL' ? '상태' : workStatusLabel[value]}
        {/*
          열리면 화살표가 돌아간다. data-state 는 Radix 가 트리거(부모)에 붙이므로 아이콘
          자신에 data-[state=open] 을 걸면 아무 일도 일어나지 않는다 — 부모의 상태를 보는
          group-data-* 로 읽어야 한다.
        */}
        <ChevronDown
          aria-hidden
          className="size-4 transition-transform group-data-[state=open]:rotate-180"
          strokeWidth={2}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-36">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as StatusFilter)}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {option === 'ALL' ? '모든 상태' : workStatusLabel[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function KindFilterChip({
  active,
  label,
  icon,
  count,
  onClick,
}: {
  active: boolean
  label: string
  icon?: React.ReactNode
  /** 칩 오른쪽 끝의 편수 — 지금 걸린 다른 조건(상태·검색어) 안에서 센 값이다 */
  count?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
        active
          ? 'border-neutral-900 bg-neutral-900 text-white'
          : 'border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900'
      }`}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span className={`tabular-nums ${active ? 'text-white/60' : 'text-neutral-400'}`}>
          {count}
        </span>
      )}
    </button>
  )
}

function WorkCardList({
  works,
  slug,
  members,
}: {
  works: LibraryEntry[]
  slug: string
  members: User[]
}) {
  if (works.length === 0) {
    return <p className="py-10 text-center text-sm text-neutral-500">표시할 작품이 없습니다.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {works.map((work) => {
        const recorded = recordedAt(work)

        return (
          <Link
            key={work.id}
            to={`/${slug}/books/${work.id}`}
            className="app-tile group flex overflow-hidden hover:ring-emerald-400/60"
          >
            <div className="aspect-[4/3] w-40 flex-none overflow-hidden bg-neutral-100 sm:w-52">
              {work.coverUrl ? (
                // 표지는 원래 세로 비율이라 가로로 긴 칸에 넣으면 잘리는데, 그대로 둔다.
                <img src={work.coverUrl} alt={work.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs font-medium text-neutral-500">
                  {work.title}
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <KindTag kind={work.kind} />
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass[work.status]}`}
                >
                  {workStatusLabel[work.status]}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-lg leading-snug font-semibold group-hover:underline">
                  『{work.title}』
                </h2>
                {work.author && <span className="text-sm text-neutral-500">{work.author}</span>}
                {work.voterCount > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Stars value={work.average} size="sm" />
                    <span className="text-sm font-semibold tabular-nums text-neutral-900">
                      {formatRating(work.average)}
                    </span>
                  </span>
                )}
              </div>

              {work.description && (
                <p className="line-clamp-2 text-sm leading-relaxed text-neutral-500">
                  {work.description}
                </p>
              )}

              <div className="mt-auto flex min-w-0 items-baseline gap-3 pt-1">
                <PickNote addedBy={work.addedBy} reason={work.reason} users={members} />
                <span className="shrink-0 text-xs text-neutral-500">
                  {recorded ? `최근 기록 ${formatRecordedAt(recorded)}` : '기록 없음'}
                </span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function AddWorkDialog({
  initialKind,
  onSubmit,
  onClose,
}: {
  initialKind?: WorkKind
  onSubmit: (input: {
    kind: WorkKind
    title: string
    author: string
    reason: string
    coverUrl?: string
    description?: string
    year?: number
  }) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [kind, setKind] = useState<WorkKind>(initialKind ?? WorkKind.BOOK)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [reason, setReason] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [description, setDescription] = useState('')
  const [year, setYear] = useState<number>()

  useEffect(() => {
    ref.current?.showModal()
  }, [])
  useLockBodyScroll()

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) ref.current?.close()
      }}
      className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-2xl p-0 shadow-xl ring-1 ring-neutral-950/10 backdrop:bg-neutral-900/40 backdrop:backdrop-blur-sm"
    >
      <form
        onKeyDown={(event) => {
          const tag = (event.target as HTMLElement).tagName
          if (event.key === 'Enter' && tag !== 'TEXTAREA' && tag !== 'BUTTON') {
            event.preventDefault()
          }
        }}
        onSubmit={(event) => {
          event.preventDefault()
          if (!title.trim()) return
          onSubmit({
            kind,
            title: title.trim(),
            author: author.trim(),
            reason: reason.trim(),
            coverUrl: coverUrl || undefined,
            description: description || undefined,
            year,
          })
        }}
        className="flex flex-col gap-3 p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-base font-semibold">작품 추가</h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="app-button app-button-ghost app-icon-button"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as WorkKind)}
          className="app-input cursor-pointer self-start"
        >
          {KIND_ORDER.map((option) => (
            <option key={option} value={option}>
              {kindLabel[option]}
            </option>
          ))}
        </select>
        <WorkPreviewCard
          kind={kind}
          title={title}
          onTitleChange={setTitle}
          author={author}
          onAuthorChange={setAuthor}
          year={year}
          onYearChange={setYear}
          description={description}
          onDescriptionChange={setDescription}
          coverUrl={coverUrl}
          onClearCover={() => setCoverUrl('')}
          reason={reason}
          onReasonChange={setReason}
        />
        {kind === WorkKind.BOOK && (
          <BookLookupField
            kind={kind}
            title={title}
            coverUrl={coverUrl}
            onPick={(book) => {
              setTitle(book.title)
              setAuthor(book.author)
              setCoverUrl(book.cover)
              setDescription(book.description)
              setYear(parseYearFromPubDate(book.pubDate))
            }}
          />
        )}
        <div className="flex justify-end">
          <button type="submit" className="app-button app-button-primary">
            후보로 담기
          </button>
        </div>
      </form>
    </dialog>
  )
}
