import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Cover from '@/components/Cover'
import RatingControl from '@/components/RatingControl'
import PersonalBlockNoteField from '@/components/slots/PersonalBlockNoteField'
import SlotField from '@/components/slots/SlotField'
import { useCurrentUser } from '@/hooks/currentUser'
import { useStudy } from '@/hooks/useStudy'
import {
  getShelfEntry,
  saveShelfDocument,
  saveShelfValue,
  setShelfPublication,
  setShelfWorkStatus,
} from '@/lib/shelfApi'
import { statusLabel } from '@/lib/workStatus'
import type { Post, SlotDef, SlotValueData } from '@/types'
import { SlotType, Visibility, WorkKind, WorkStatus } from '@/types'

const nextStatus: Partial<Record<WorkStatus, { status: WorkStatus; label: string }>> = {
  [WorkStatus.CANDIDATE]: { status: WorkStatus.READING, label: '읽기 시작' },
  [WorkStatus.READING]: { status: WorkStatus.DONE, label: '완료' },
}

/**
 * 혼자 담은 책의 상세. 스터디에서 온 책은 여기 없다 — 그 책은 스터디 작품 상세의
 * "내 메모" 드로어에서 쓰고, 서재에서 눌러도 그쪽으로 간다([ShelfPage] 의 entryHref).
 * 그래서 옛 링크로 들어오면 서버가 404 를 주고 아래 문구가 뜬다.
 */
export default function ShelfWorkPage() {
  const { workId = '' } = useParams()
  const { user } = useCurrentUser()
  const { study: currentStudy } = useStudy()
  const qc = useQueryClient()

  const { data, isPending } = useQuery({
    queryKey: ['shelfEntry', user?.id, workId],
    queryFn: () => getShelfEntry(workId),
    enabled: !!user,
  })

  const save = useMutation({
    mutationFn: saveShelfValue,
    onSuccess: () => qc.invalidateQueries(),
  })
  const saveDocument = useMutation({
    mutationFn: (bodyJson: string) => saveShelfDocument(workId, bodyJson),
  })
  const changeStatus = useMutation({
    mutationFn: (status: WorkStatus) => setShelfWorkStatus(workId, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['shelfEntry', user?.id, workId] })
      void qc.invalidateQueries({ queryKey: ['shelf'] })
      void qc.invalidateQueries({ queryKey: ['userShelf'] })
    },
  })

  if (isPending) return <p className="text-sm text-neutral-500">불러오는 중…</p>
  if (!data || !user || !currentStudy)
    return <p className="text-sm text-neutral-500">내 서재에 없는 책입니다.</p>

  const { work, study, slots, values } = data
  const targetId = work.id

  const valueOf = (slot: SlotDef) => values.find((v) => v.slotDefId === slot.id)

  const ratingSlot = slots.find((s) => s.type === SlotType.RATING)
  const blurbSlot = slots.find(
    (s) => s.type === SlotType.TEXT_SHORT && s.visibility !== Visibility.PRIVATE,
  )
  const ratingValue = ratingSlot && valueOf(ratingSlot)?.value
  const rating = ratingValue && 'n' in ratingValue ? ratingValue.n : 0
  const documentBlocks = parseBlocks(data.personalBodyJson)
  const step = nextStatus[work.status]

  return (
    <div className="flex flex-col gap-10">
      <Link
        to={`/${currentStudy.slug}/shelf`}
        className="text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← 내 서재
      </Link>

      <header className="app-card flex gap-6 p-6 sm:p-8">
        <div className="w-40 flex-none sm:w-44">
          <Cover work={work} size="lg" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 pt-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-neutral-500">
              {work.kind === WorkKind.MOVIE ? 'Movie' : 'Book'}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                work.status === WorkStatus.READING
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                  : 'border-neutral-200 text-neutral-500'
              }`}
            >
              {statusLabel[work.status]}
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{work.title}</h1>
          <p className="text-sm text-neutral-500">
            {work.author} · {work.year}
          </p>
          {work.actors && work.actors.length > 0 && (
            <p className="text-xs text-neutral-500">출연 {work.actors.join(' · ')}</p>
          )}
          {work.description && (
            <p className="max-w-xl text-sm leading-relaxed text-neutral-600">{work.description}</p>
          )}
          <span className="text-xs text-neutral-500">{study ? study.name : '혼자 읽은 책'}</span>

          {step && (
            <button
              type="button"
              onClick={() => changeStatus.mutate(step.status)}
              disabled={changeStatus.isPending}
              className="app-button app-button-primary mt-2 w-fit"
            >
              {step.label}
            </button>
          )}

          {(ratingSlot || blurbSlot) && (
            <div className="mt-auto flex flex-col gap-2 pt-2">
              {ratingSlot && (
                <RatingControl
                  value={rating}
                  onSave={(next) =>
                    save.mutate({
                      targetId,
                      slotDefId: ratingSlot.id,
                      value: { n: next },
                      draft: false,
                    })
                  }
                />
              )}
              {blurbSlot && (
                <SlotField
                  slot={blurbSlot}
                  value={valueOf(blurbSlot)?.value}
                  onSave={(value) =>
                    save.mutate({
                      targetId,
                      slotDefId: blurbSlot.id,
                      value,
                      draft: false,
                    })
                  }
                />
              )}
            </div>
          )}
        </div>
      </header>

      <PublicationControls
        key={`${workId}-${data.publication?.id ?? 'new'}-${data.publication?.sharedStudyIds.join(',') ?? ''}`}
        workId={workId}
        publication={data.publication}
      />

      <section aria-label="개인 노트" className="app-card min-h-96 px-3 py-5 sm:px-6">
        <PersonalBlockNoteField
          key={`${workId}-${user.id}`}
          value={{ blocks: documentBlocks }}
          onSave={(value: SlotValueData) => {
            if ('blocks' in value) saveDocument.mutate(JSON.stringify(value.blocks))
          }}
        />
      </section>
    </div>
  )
}

function PublicationControls({
  workId,
  publication,
}: {
  workId: string
  publication: Post | null
}) {
  const qc = useQueryClient()
  const [title, setTitle] = useState(publication?.title ?? '')
  const update = useMutation({
    mutationFn: (published: boolean) => setShelfPublication(workId, { title, published }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['shelfEntry'] })
      void qc.invalidateQueries({ queryKey: ['userPosts'] })
      void qc.invalidateQueries({ queryKey: ['studyPosts'] })
      void qc.invalidateQueries({ queryKey: ['blogProfile'] })
    },
  })

  return (
    <section className="app-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start gap-4">
        <div>
          <h2 className="font-medium">발행</h2>
          <p className="mt-1 text-sm text-neutral-500">
            이 책의 자유형식 기록을 독서스터디와 내 블로그에 공개합니다.
          </p>
        </div>
        <span
          className={`ml-auto rounded-full px-2 py-1 text-xs ${publication?.published ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}
        >
          {publication?.published ? '공개 중' : '비공개'}
        </span>
      </div>
      <label className="mt-5 block text-sm text-neutral-600">
        글 제목
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="제목을 입력하세요"
          className="app-input mt-2 w-full text-base"
        />
      </label>
      <div className="mt-5 flex items-center gap-3">
        {publication?.published ? (
          <>
            <button
              type="button"
              onClick={() => update.mutate(true)}
              disabled={update.isPending || !title.trim()}
              className="app-button app-button-primary"
            >
              제목 저장
            </button>
            <button
              type="button"
              onClick={() => update.mutate(false)}
              disabled={update.isPending}
              className="app-button"
            >
              비공개로 전환
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => update.mutate(true)}
            disabled={update.isPending || !title.trim()}
            className="app-button app-button-primary"
          >
            발행
          </button>
        )}
      </div>
    </section>
  )
}

function parseBlocks(bodyJson: string | null): unknown[] {
  if (!bodyJson) return []
  try {
    const value: unknown = JSON.parse(bodyJson)
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}
