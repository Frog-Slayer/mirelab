import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import BookLookupField from '@/components/BookLookupField'
import Cover from '@/components/Cover'
import Stars from '@/components/Stars'
import WorkPreviewCard from '@/components/WorkPreviewCard'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import { useStudy } from '@/hooks/useStudy'
import { parseYearFromPubDate } from '@/lib/bookApi'
import { formatRating } from '@/lib/format'
import { addWork, getLibrary, type LibraryEntry } from '@/lib/workApi'
import { WorkKind, WorkStatus } from '@/types'

type Filter = 'ALL' | WorkKind

const filters: Array<{ key: Filter; label: string }> = [
  { key: 'ALL', label: '전체' },
  { key: WorkKind.BOOK, label: '책' },
  { key: WorkKind.MOVIE, label: '영화' },
]

const statusPriority = {
  [WorkStatus.DONE]: 0,
  [WorkStatus.READING]: 1,
  [WorkStatus.CANDIDATE]: 2,
} satisfies Record<LibraryEntry['status'], number>

/**
 * 상태마다 줄 세우는 기준 날짜가 다르다 — 후보는 담긴 날, 진행 중은 시작한 날,
 * 완료는 끝난 날. "이 상태가 된 지 얼마나 됐나"가 각 묶음에서 궁금한 것이라서다.
 */
function sortKey(work: LibraryEntry): string | null | undefined {
  if (work.status === WorkStatus.DONE) return work.finishedAt
  if (work.status === WorkStatus.READING) return work.startedAt
  return work.addedAt
}

/**
 * 오래된 것이 위로 — 스터디가 지나온 순서대로 읽힌다.
 *
 * 날짜가 없는 작품(이 필드들이 생기기 전에 만들어진 것)은 언제인지 알 수 없으니 있는
 * 것들 뒤로 몰고, 그들끼리는 제목순으로 떨어지게 둔다 — 0 을 돌려 다음 기준으로 넘긴다.
 * 오름차순이라고 해서 "모르는 것"을 맨 앞에 두면 아무 근거 없이 제일 오래된 척이 된다.
 */
function byOldest(a: string | null | undefined, b: string | null | undefined): number {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return a.localeCompare(b)
}

type RatingSort = 'asc' | 'desc' | null
/** 상태는 끌 수 없다 — 완료 → 진행 중 → 후보(default) 아니면 그 반대(reversed) 둘 중 하나 */
type StatusSort = 'default' | 'reversed'

/**
 * 평점 정렬 버튼을 안 눌렀으면(ratingSort === null) 상태 → 날짜 → 제목 → id 순 기본
 * 정렬을 쓴다. 상태는 완료 → 진행 중 → 후보가 기본이고, 정렬 버튼으로 그 반대 방향만
 * 토글한다 — "정렬 해제"는 없다(둘 중 하나는 항상 켜져 있다).
 *
 * 평점 정렬을 눌러서 동점이 나와도 이 기본 정렬로 떨어뜨린다. 완료·진행 중은 그 상태가
 * 된 시점, 후보는 책장에 담긴 시점 순이고, 그마저 같으면(테스트 데이터처럼 날짜가 비어
 * 있는 경우) 제목 → id 순으로 가른다.
 */
function compareWorks(
  a: LibraryEntry,
  b: LibraryEntry,
  ratingSort: RatingSort,
  statusSort: StatusSort,
): number {
  if (ratingSort) {
    const base = a.average - b.average
    const directed = ratingSort === 'asc' ? base : -base
    if (directed !== 0) return directed
  }

  const statusBase = statusPriority[a.status] - statusPriority[b.status]
  const statusDifference = statusSort === 'reversed' ? -statusBase : statusBase
  if (statusDifference !== 0) return statusDifference

  const byDate = byOldest(sortKey(a), sortKey(b))
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

const statusRowClass = {
  [WorkStatus.DONE]: 'bg-emerald-50/40 hover:bg-emerald-50/80',
  [WorkStatus.READING]: 'bg-blue-50/40 hover:bg-blue-50/80',
  [WorkStatus.CANDIDATE]: 'bg-amber-50/40 hover:bg-amber-50/80',
} satisfies Record<LibraryEntry['status'], string>

export default function AllWorksPage() {
  const { study } = useStudy()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('ALL')
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

  const shown = works.filter((work) => filter === 'ALL' || work.kind === filter)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-neutral-200 pb-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">작품 목록</h1>
          <p className="text-sm text-neutral-500">
            진행 중인 책과 후보를 포함한 전체 {works.length}편
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg bg-neutral-100 p-1">
            {filters.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs transition-colors ${
                  filter === item.key
                    ? 'bg-white font-medium text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="app-button app-button-primary"
          >
            작품 추가
          </button>
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
        <AllWorksTable works={shown} slug={study.slug} />
      )}
    </div>
  )
}

function RatingSortHeader({
  sort,
  onToggle,
}: {
  sort: RatingSort
  onToggle: () => void
}) {
  return (
    <th scope="col" className="w-28 border-l border-neutral-200 p-0 font-medium">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-center gap-1 px-4 py-2 hover:text-neutral-900"
      >
        평점
        <span aria-hidden className={sort ? 'text-neutral-700' : 'text-neutral-300'}>
          {sort === 'desc' ? '▼' : '▲'}
        </span>
      </button>
    </th>
  )
}

/** 상태는 항상 어느 한 방향으로든 정렬돼 있어서(끌 수 없음) 화살표를 늘 진하게 보여준다 */
function StatusSortHeader({
  sort,
  onToggle,
}: {
  sort: StatusSort
  onToggle: () => void
}) {
  return (
    <th scope="col" className="w-20 border-l border-neutral-200 p-0 font-medium">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-center gap-1 px-2 py-2 hover:text-neutral-900"
      >
        상태
        <span aria-hidden className="text-neutral-700">
          {sort === 'default' ? '▼' : '▲'}
        </span>
      </button>
    </th>
  )
}

function AllWorksTable({ works, slug }: { works: LibraryEntry[]; slug: string }) {
  const [ratingSort, setRatingSort] = useState<RatingSort>(null)
  const [statusSort, setStatusSort] = useState<StatusSort>('default')

  if (works.length === 0) {
    return <p className="py-10 text-center text-sm text-neutral-400">표시할 작품이 없습니다.</p>
  }

  const sorted = [...works].sort((a, b) => compareWorks(a, b, ratingSort, statusSort))

  // 안 눌렀을 땐 기본 정렬. 한 번 누르면 오름차순 ↔ 내림차순만 토글한다 — 기본 정렬로
  // 돌아가는 "해제" 단계는 없다.
  const toggleRatingSort = () => {
    setRatingSort((current) => (current === 'asc' ? 'desc' : 'asc'))
  }

  // 상태는 끌 수 없다 — 기본(완료→진행 중→후보) ↔ 반대 방향만 토글한다.
  const toggleStatusSort = () => {
    setStatusSort((current) => (current === 'default' ? 'reversed' : 'default'))
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] table-fixed border-collapse text-left text-sm">
          <thead className="bg-neutral-50 text-xs text-neutral-500">
            <tr>
              <th scope="col" className="w-14 px-2 py-2 text-center font-medium">
                구분
              </th>
              <th
                scope="col"
                className="w-40 border-l border-neutral-200 px-4 py-2 text-center font-medium"
              >
                작품
              </th>
              <th
                scope="col"
                className="w-32 border-l border-neutral-200 px-4 py-2 text-center font-medium"
              >
                저자/감독
              </th>
              <StatusSortHeader sort={statusSort} onToggle={toggleStatusSort} />
              <RatingSortHeader sort={ratingSort} onToggle={toggleRatingSort} />
              <th
                scope="col"
                className="w-60 border-l border-neutral-200 px-4 py-2 text-center font-medium"
              >
                선정 사유
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {sorted.map((work) => (
              <tr key={work.id} className={`transition-colors ${statusRowClass[work.status]}`}>
                <td className="px-2 py-2 text-center text-neutral-500">
                  {work.kind === WorkKind.BOOK ? '책' : '영화'}
                </td>
                <td className="overflow-hidden border-l border-neutral-200 px-4 py-2 text-left">
                  <Link
                    to={`/${slug}/books/${work.id}`}
                    className="group flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    <div className="w-6 flex-none">
                      <Cover work={work} size="xxs" />
                    </div>
                    <div className="min-w-0">
                      <div
                        className="truncate font-medium text-neutral-900 group-hover:text-emerald-700"
                        title={work.title}
                      >
                        {work.title}
                      </div>
                    </div>
                  </Link>
                </td>
                <td className="border-l border-neutral-200 px-4 py-2 text-neutral-500">
                  <div className="max-w-32 truncate" title={work.author || undefined}>
                    {work.author || '—'}
                  </div>
                </td>
                <td className="border-l border-neutral-200 px-2 py-2 text-center">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${statusBadgeClass[work.status]}`}
                  >
                    {statusLabel[work.status]}
                  </span>
                </td>
                <td className="border-l border-neutral-200 px-4 py-2 text-center">
                  {work.voterCount > 0 ? (
                    <span className="flex items-center justify-center gap-2 whitespace-nowrap">
                      <Stars value={work.average} size="sm" />
                      <span className="font-medium tabular-nums">{formatRating(work.average)}</span>
                    </span>
                  ) : (
                    <span className="block text-neutral-400">—</span>
                  )}
                </td>
                <td className="border-l border-neutral-200 px-4 py-2 text-left text-neutral-600">
                  {work.reason ? (
                    <div className="truncate" title={work.reason}>
                      {work.reason}
                    </div>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
          <option value={WorkKind.BOOK}>책</option>
          <option value={WorkKind.MOVIE}>영화</option>
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
