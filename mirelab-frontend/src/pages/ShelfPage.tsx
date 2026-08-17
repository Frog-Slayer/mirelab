import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookcase, type BookcaseItem } from '@/components/Bookcase'
import { useCurrentUser } from '@/hooks/currentUser'
import { useStudy } from '@/hooks/useStudy'
import { addPersonalWork, getShelf, type ShelfEntry } from '@/mocks/api'
import { formatRating } from '@/lib/format'
import type { SlotDef } from '@/types'
import { SlotType, WorkKind, WorkStatus } from '@/types'

/** 스터디에서 온 책도 내 서재 안에서는 똑같이 자기 페이지(별도 기록)를 갖는다 */
function entryHref(entry: ShelfEntry, currentStudySlug: string) {
  return `/${currentStudySlug}/shelf/${entry.work.id}`
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
    queryFn: () => getShelf(user!.id),
    enabled: !!user,
  })

  const create = useMutation({
    mutationFn: addPersonalWork,
    onSuccess: () => qc.invalidateQueries(),
  })

  if (!user || !study || !shelf) return <p className="text-sm text-neutral-400">불러오는 중…</p>

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

  const toItem = (item: DisplayEntry): BookcaseItem => ({
    id: item.entry.work.id,
    title: item.entry.work.title,
    author: item.entry.work.author,
    year: item.entry.work.year,
    kind: item.entry.work.kind,
    status: item.entry.work.status,
    href: entryHref(item.entry, study.slug),
    source: item.entry.study?.name ?? null,
    average: item.rating ?? undefined,
    voterCount: item.rating !== null ? 1 : 0,
    addedBy: item.entry.work.addedBy,
    reason: item.entry.work.reason,
    description: item.entry.work.description,
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
      <div className="flex flex-col gap-5 border-b border-neutral-200 pb-6">
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">내 서재</h1>
        <RatingHistogram entries={entries} myRating={myRating} />
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

      <Bookcase completed={completedItems} others={otherItems} onAdd={() => setAdding(true)} />
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
    <div className="flex w-full flex-col gap-2">
      <span className="text-xs text-neutral-500">
        {entries.length}권 · 평가 {rated}권 · 평균 ★ {formatRating(average)}
      </span>
      {/* 데이터가 없어도 칸/축은 그대로 보여준다 — 0점짜리 막대들일 뿐이다 */}
      <div className="flex h-24 items-end gap-1 border-b border-neutral-200">
        {buckets.map((count, i) => {
          const label = (i * RATING_STEP).toFixed(1)
          // 빨강(0점) → 초록(5점), 파스텔 톤으로 채도·명도를 낮춰 쨍하지 않게 한다.
          const hue = Math.round((i / (RATING_BUCKETS - 1)) * 120)
          // 0개인 칸도 아예 안 보이지 않도록 1개 높이의 절반만큼은 채워서 "0"을 보여준다.
          const unit = (1 / max) * 100
          const heightPct = count === 0 ? unit / 2 : (count / max) * 100
          return (
            <div
              key={i}
              className="flex h-full flex-1 flex-col items-center justify-end gap-0.5"
              title={`${label}~${(i * RATING_STEP + RATING_STEP).toFixed(1)}점 · ${count}권`}
            >
              <span className="font-mono text-[9px] text-neutral-500 tabular-nums">{count}</span>
              <div
                className="w-full rounded-t-lg"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: `hsl(${hue}, 60%, 62%)`,
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-1">
        {buckets.map((_, i) => (
          <span
            key={i}
            className="flex-1 text-center font-mono text-[9px] whitespace-nowrap text-neutral-400"
          >
            {i % 2 === 0 ? (i * RATING_STEP).toFixed(1) : ''}
          </span>
        ))}
      </div>
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
