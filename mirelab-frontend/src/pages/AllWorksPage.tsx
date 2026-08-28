import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import BookLookupField from '@/components/BookLookupField'
import Stars from '@/components/Stars'
import WorkPreviewCard from '@/components/WorkPreviewCard'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import { useStudy } from '@/hooks/useStudy'
import { parseYearFromPubDate } from '@/lib/bookApi'
import { formatRating } from '@/lib/format'
import { addWork, getLibrary, type LibraryEntry } from '@/lib/workApi'
import { KIND_ORDER, kindBadgeClass, kindIcon, kindLabel } from '@/lib/workKind'
import { WorkKind, WorkStatus } from '@/types'

type Filter = 'ALL' | WorkKind

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

const statusLabel = {
  [WorkStatus.READING]: '진행 중',
  [WorkStatus.CANDIDATE]: '후보',
  [WorkStatus.DONE]: '완료',
} satisfies Record<LibraryEntry['status'], string>

const statusBadgeClass = {
  [WorkStatus.DONE]: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  [WorkStatus.READING]: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  [WorkStatus.CANDIDATE]: 'bg-amber-50 text-amber-700 ring-amber-600/20',
} satisfies Record<LibraryEntry['status'], string>

function formatRecordedAt(value: string) {
  const date = new Date(value)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

export default function AllWorksPage() {
  const { study } = useStudy()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('ALL')
  const [sort, setSort] = useState<SortKey>('recent')
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
  const shown = works
    .filter((work) => filter === 'ALL' || work.kind === filter)
    .filter(
      (work) =>
        !keyword ||
        work.title.toLowerCase().includes(keyword) ||
        work.author.toLowerCase().includes(keyword),
    )
    .sort((a, b) => compareWorks(a, b, sort))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">작품 목록</h1>
          <p className="text-sm text-neutral-500">
            진행 중인 책과 후보를 포함한 전체 {works.length}편
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="app-button app-button-primary"
          >
            작품 추가
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <KindFilterChip
            active={filter === 'ALL'}
            label="전체"
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
                onClick={() => setFilter(kind)}
              />
            )
          })}
        </div>

        <div className="flex items-center gap-4">
          {sortOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setSort(option.key)}
              className={`cursor-pointer text-sm transition-colors ${
                sort === option.key
                  ? 'font-semibold text-neutral-900'
                  : 'text-neutral-400 hover:text-neutral-700'
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
        <p className="text-sm text-neutral-400">불러오는 중…</p>
      ) : (
        <WorkCardList works={shown} slug={study.slug} />
      )}
    </div>
  )
}

function KindFilterChip({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean
  label: string
  icon?: React.ReactNode
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
    </button>
  )
}

function WorkCardList({ works, slug }: { works: LibraryEntry[]; slug: string }) {
  if (works.length === 0) {
    return <p className="py-10 text-center text-sm text-neutral-400">표시할 작품이 없습니다.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {works.map((work) => {
        const recorded = recordedAt(work)

        return (
          <Link
            key={work.id}
            to={`/${slug}/books/${work.id}`}
            className="group flex overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:border-emerald-300"
          >
            <div className="aspect-[4/3] w-40 flex-none overflow-hidden bg-neutral-100 sm:w-52">
              {work.coverUrl ? (
                // 표지는 원래 세로 비율이라 가로로 긴 칸에 넣으면 잘리는데, 그대로 둔다.
                <img src={work.coverUrl} alt={work.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs font-medium text-neutral-400">
                  {work.title}
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${kindBadgeClass[work.kind]}`}
                >
                  {kindLabel[work.kind]}
                </span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${statusBadgeClass[work.status]}`}
                >
                  {statusLabel[work.status]}
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

              {/* 선정 사유와 기록 줄은 한 덩이로 카드 아래에 붙인다 — mt-auto 를 둘 다에
                  걸면 남는 공간이 둘로 쪼개져서 사이가 벌어진다 */}
              <div className="mt-auto flex flex-col gap-2 pt-1">
                {work.reason && (
                  <p className="line-clamp-1 text-sm font-semibold text-neutral-800">
                    {work.reason}
                  </p>
                )}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-neutral-400">
                    {recorded ? `최근 기록 ${formatRecordedAt(recorded)}` : '기록 없음'}
                  </span>
                  <span className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 transition group-hover:border-neutral-400 group-hover:text-neutral-900">
                    상세 보기
                  </span>
                </div>
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
      className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-sm border border-neutral-200 p-0 backdrop:bg-neutral-900/30"
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
          className="cursor-pointer self-start rounded-sm border border-neutral-200 px-2 py-2 text-sm text-neutral-700"
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
