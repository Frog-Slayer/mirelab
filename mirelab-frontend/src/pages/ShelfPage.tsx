import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookcase, type BookcaseItem } from '@/components/Bookcase'
import BookLookupField from '@/components/BookLookupField'
import WorkPreviewCard from '@/components/WorkPreviewCard'
import { useCurrentUser } from '@/hooks/currentUser'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import { useStudy } from '@/hooks/useStudy'
import { parseYearFromPubDate } from '@/lib/bookApi'
import { addPersonalWork, getShelf, type ShelfEntry } from '@/lib/shelfApi'
import { formatRating } from '@/lib/format'
import type { SlotDef } from '@/types'
import { SlotType, WorkKind, WorkStatus } from '@/types'

/**
 * 스터디에서 온 책은 그 스터디의 작품 상세로 보낸다 — 그 책의 기록은 거기 "내 기록"
 * 드로어 한 곳에서만 쓰기 때문이다. 개인 페이지는 혼자 담은 책에만 있다.
 *
 * 어느 스터디로 보낼지는 그 책이 속한 스터디(`entry.study`)를 따른다. 서재에는 내가 속한
 * 스터디 전부의 책이 섞여 꽂히므로, 지금 보고 있는 스터디와 다를 수 있다.
 */
function entryHref(entry: ShelfEntry, currentStudySlug?: string) {
  return entry.study
    ? `/${entry.study.slug}/books/${entry.work.id}`
    : `/${currentStudySlug ?? ''}/shelf/${entry.work.id}`
}

const statusPriority: Record<string, number> = {
  [WorkStatus.READING]: 0,
  [WorkStatus.CANDIDATE]: 1,
}

/**
 * 내 서재 — 내 책 목록. 여기서는 보기만 하고, 쓰는 건 상세에서 한다.
 */
export default function ShelfPage() {
  const { user } = useCurrentUser()
  const { study } = useStudy()
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)

  const { data: shelf } = useQuery({
    queryKey: ['shelf', user?.id],
    queryFn: () => getShelf(),
    enabled: !!user,
  })

  const create = useMutation({
    mutationFn: addPersonalWork,
    onSuccess: () => qc.invalidateQueries(),
  })

  if (!user || !study || !shelf) return <p className="text-sm text-neutral-500">불러오는 중…</p>

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-5 border-b border-neutral-200 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">내 서재</h1>
      </div>

      {adding && (
        <AddDialog
          onClose={() => setAdding(false)}
          onSubmit={(input) => {
            create.mutate(input)
            setAdding(false)
          }}
        />
      )}

      <ShelfContents shelf={shelf} currentStudySlug={study.slug} onAdd={() => setAdding(true)} />
    </div>
  )
}

export function ShelfContents({
  shelf,
  currentStudySlug,
  onAdd,
}: {
  shelf: { slots: SlotDef[]; entries: ShelfEntry[] }
  currentStudySlug?: string
  onAdd?: () => void
}) {
  const { slots, entries } = shelf
  const ratingSlotOf = (entry: ShelfEntry) =>
    slots.find(
      (slot) => slot.type === SlotType.RATING && (!entry.study || slot.studyId === entry.study.id),
    ) ?? slots.find((slot) => slot.type === SlotType.RATING)

  const myRating = (entry: ShelfEntry) => {
    const v = entry.values.find((x) => x.slotDefId === ratingSlotOf(entry)?.id)
    return v && 'n' in v.value ? v.value.n : null
  }

  // 내가 매긴 점수 순. 아직 안 매긴 책은 뒤로 민다
  const sorted = [...entries].sort((a, b) => (myRating(b) ?? -1) - (myRating(a) ?? -1))
  const displayEntries = sorted.map((entry) => ({
    entry,
    rating: myRating(entry),
    blurb: textValue(
      entry,
      slots.find(
        (slot) =>
          slot.type === SlotType.TEXT_SHORT && (!entry.study || slot.studyId === entry.study.id),
      ),
    ),
  }))

  const toItem = (item: DisplayEntry): BookcaseItem => ({
    id: item.entry.work.id,
    title: item.entry.work.title,
    author: item.entry.work.author,
    year: item.entry.work.year,
    kind: item.entry.work.kind,
    status: item.entry.work.status,
    href: entryHref(item.entry, currentStudySlug),
    source: item.entry.study?.name ?? null,
    average: item.rating ?? undefined,
    voterCount: item.rating !== null ? 1 : 0,
    addedBy: item.entry.work.addedBy,
    reason: item.entry.work.reason,
    description: item.entry.work.description,
    coverUrl: item.entry.work.coverUrl,
    actors: item.entry.work.actors,
  })
  // 완료작은 위 칸에, 읽는 중·후보는 아래 칸에 — 완료작 정렬은 내 평점순을 그대로 따른다.
  const completedItems = displayEntries
    .filter((item) => item.entry.work.status === WorkStatus.DONE)
    .map(toItem)
  // 읽는 중·후보가 섞여 있으면 스터디·개인 구분 없이 읽는 중이 항상 앞에 온다.
  const otherItems = displayEntries
    .filter((item) => item.entry.work.status !== WorkStatus.DONE)
    .sort((a, b) => statusPriority[a.entry.work.status] - statusPriority[b.entry.work.status])
    .map(toItem)

  return (
    <div className="flex flex-col gap-8">
      <RatingHistogram entries={entries} myRating={myRating} />
      <Bookcase completed={completedItems} others={otherItems} onAdd={onAdd} />
    </div>
  )
}

const RATING_STEP = 0.5
// 0.0 ~ 5.0 을 0.5 단위로 끊으면 11칸
const RATING_BUCKETS = Math.round(5 / RATING_STEP) + 1

/** 권 수 텍스트 대신, 내가 매긴 점수의 분포(0.5점 단위)를 세로 막대로 보여준다 */
function RatingHistogram({
  entries,
  myRating,
}: {
  entries: ShelfEntry[]
  myRating: (entry: ShelfEntry) => number | null
}) {
  const buckets = Array<number>(RATING_BUCKETS).fill(0)
  let rated = 0
  let sum = 0
  for (const entry of entries) {
    const r = myRating(entry)
    if (r === null) continue
    const idx = Math.min(RATING_BUCKETS - 1, Math.max(0, Math.floor(r / RATING_STEP)))
    buckets[idx] += 1
    rated += 1
    sum += r
  }
  const max = Math.max(1, ...buckets)
  const average = rated ? sum / rated : 0

  return (
    <section className="grid items-end gap-6 rounded-2xl bg-[#eef1f3] px-5 py-4 sm:grid-cols-[auto_1fr] sm:px-6">
      <div className="min-w-28">
        <p className="text-xs font-medium text-neutral-500">나의 평점</p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="font-serif text-3xl font-semibold tabular-nums text-neutral-900">
            {rated ? formatRating(average) : '—'}
          </span>
          {rated > 0 && <span className="text-sm text-[#39725f]">★</span>}
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          {entries.length}작품 중 {rated}작품 평가
        </p>
      </div>

      <div>
        <div className="flex h-16 items-end gap-1.5" aria-label="평점 분포">
          {buckets.map((count, i) => {
            const label = (i * RATING_STEP).toFixed(1)
            const heightPct = count === 0 ? 5 : Math.max(12, (count / max) * 100)
            return (
              <div key={i} className="h-full flex-1" title={`${label}점 · ${count}작품`}>
                <div className="flex h-full items-end">
                  <span
                    className={`block w-full rounded-full ${count ? 'bg-[#39725f]' : 'bg-neutral-300/70'}`}
                    style={{ height: `${heightPct}%`, opacity: count ? 0.35 + (i / 10) * 0.65 : 1 }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-2 flex justify-between text-[10px] tabular-nums text-neutral-400">
          <span>0</span>
          <span>2.5</span>
          <span>5</span>
        </div>
      </div>
    </section>
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

export function AddDialog({
  onSubmit,
  onClose,
}: {
  onSubmit: (input: {
    kind: WorkKind
    title: string
    author: string
    coverUrl?: string
    description?: string
    year?: number
  }) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [kind, setKind] = useState<WorkKind>(WorkKind.BOOK)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
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
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close()
      }}
      className="m-auto w-[min(38rem,calc(100vw-2rem))] rounded-2xl p-0 shadow-xl ring-1 ring-neutral-950/10 backdrop:bg-neutral-900/40 backdrop:backdrop-blur-sm"
    >
      <form
        onKeyDown={(e) => {
          // 버튼을 눌러야만 제출한다 — 인풋에서 엔터로 실수 제출되는 걸 막는다
          const tag = (e.target as HTMLElement).tagName
          if (e.key === 'Enter' && tag !== 'TEXTAREA' && tag !== 'BUTTON') e.preventDefault()
        }}
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim()) return
          onSubmit({
            kind,
            title: title.trim(),
            author: author.trim(),
            coverUrl: coverUrl || undefined,
            description: description || undefined,
            year,
          })
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

        <div className="flex items-center gap-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as WorkKind)}
            className="app-input cursor-pointer"
          >
            <option value={WorkKind.BOOK}>책</option>
            <option value={WorkKind.MOVIE}>영화</option>
          </select>
          <button type="submit" className="app-button app-button-primary ml-auto">
            담기
          </button>
        </div>

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

        <p className="text-xs text-neutral-500">
          스터디와 무관하게 혼자 읽는 책입니다. 스터디에서 읽은 책은 자동으로 들어옵니다.
        </p>
      </form>
    </dialog>
  )
}
