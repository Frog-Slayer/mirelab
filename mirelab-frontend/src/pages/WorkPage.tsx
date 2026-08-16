import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Cover from '@/components/Cover'
import Stars from '@/components/Stars'
import PickNote from '@/components/PickNote'
import SlotField from '@/components/slots/SlotField'
import { useCurrentUser } from '@/hooks/currentUser'
import { useStudy } from '@/hooks/useStudy'
import {
  getWork,
  getWorkSlots,
  removeWork,
  saveValue,
  setWorkStatus,
  updateWorkReason,
} from '@/mocks/api'
import { formatMeetAt, formatRating } from '@/lib/format'
import type { User } from '@/types'
import { SlotScope, SlotType, Visibility, WorkKind, WorkStatus } from '@/types'

const statusLabel: Record<string, string> = {
  [WorkStatus.CANDIDATE]: '후보',
  [WorkStatus.READING]: '읽는 중',
  [WorkStatus.DONE]: '완료',
}

/** 앞으로 한 칸 나아가는 동작. 완료는 끝이라 없다 */
const nextStep: Partial<Record<WorkStatus, { to: WorkStatus; label: string }>> = {
  [WorkStatus.CANDIDATE]: { to: WorkStatus.READING, label: '시작' },
  [WorkStatus.READING]: { to: WorkStatus.DONE, label: '완료' },
}

export default function WorkPage() {
  const { workId = '' } = useParams()
  const { user } = useCurrentUser()
  const { study, members } = useStudy()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [manageOpen, setManageOpen] = useState(false)

  const { data } = useQuery({ queryKey: ['work', workId], queryFn: () => getWork(workId) })
  const { data: workSlots } = useQuery({
    queryKey: ['workSlots', study?.id, workId],
    queryFn: () => getWorkSlots(study!.id, workId),
    enabled: !!study,
  })

  const refresh = () => qc.invalidateQueries()
  const changeStatus = useMutation({
    mutationFn: (status: WorkStatus) => setWorkStatus(workId, status),
    onSuccess: refresh,
  })
  const editReason = useMutation({
    mutationFn: (reason: string) => updateWorkReason({ workId, userId: user!.id, reason }),
    onSuccess: refresh,
  })
  const save = useMutation({ mutationFn: saveValue, onSuccess: refresh })
  const drop = useMutation({
    mutationFn: () => removeWork(workId),
    onSuccess: () => {
      qc.invalidateQueries()
      navigate(`/${study?.slug}`)
    },
  })

  if (!data || !study || !user) return <p className="text-sm text-neutral-400">불러오는 중…</p>

  const { work, sessions } = data
  const slots = workSlots?.slots ?? []
  const values = workSlots?.values ?? []
  const personalSlots = slots.filter((slot) => slot.scope === SlotScope.PERSONAL)
  const myValueOf = (slotId: string) =>
    values.find((value) => value.slotDefId === slotId && value.userId === user.id)
  const step = nextStep[work.status]

  const hasRecords = sessions.length > 0 || work.voterCount > 0
  const deletable = work.status === WorkStatus.CANDIDATE && !hasRecords
  const lockReason =
    work.status !== WorkStatus.CANDIDATE
      ? '후보 상태에서만 지울 수 있습니다'
      : sessions.length > 0
        ? `모임 ${sessions.length}개가 걸려 있습니다`
        : '별점 기록이 남아 있습니다'

  const blurbSlot = slots.find(
    (s) => s.type === SlotType.TEXT_SHORT && s.visibility !== Visibility.PRIVATE,
  )
  const blurbOf = (userId: string) => {
    const v = values.find((x) => x.slotDefId === blurbSlot?.id && x.userId === userId)
    return v && 'text' in v.value ? v.value.text : ''
  }

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-start justify-between gap-8 border-b border-neutral-200 pb-8">
        <div className="flex items-center gap-6">
          <div className="w-32">
            <Cover work={work} size="lg" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">
                {work.kind === WorkKind.MOVIE ? 'Movie' : 'Book'}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs ${
                  work.status === WorkStatus.READING
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                    : 'border-neutral-200 text-neutral-500'
                }`}
              >
                {statusLabel[work.status]}
              </span>
            </div>
            <h1 className="text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-4xl">
              {work.title}
            </h1>
            <p className="text-base text-neutral-500">
              {work.author} · {work.year}
            </p>
            {work.actors && work.actors.length > 0 && (
              <p className="text-xs text-neutral-400">출연 {work.actors.join(' · ')}</p>
            )}
            {work.description && (
              <p className="max-w-xl text-sm text-neutral-600">{work.description}</p>
            )}
            <div className="mt-1">
              <PickBlock
                addedBy={work.addedBy}
                reason={work.reason}
                users={members}
                canEdit={work.addedBy === user.id}
                onSave={(next) => editReason.mutate(next)}
              />
            </div>
            {work.voterCount > 0 && (
              <div className="mt-3 flex flex-wrap items-start gap-x-10 gap-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="font-serif text-4xl leading-none tabular-nums">
                    {formatRating(work.average)}
                  </span>
                  <Stars value={work.average} />
                  <span className="text-xs text-neutral-500">{work.voterCount}명</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {members.map((m) => {
                    const score = work.ratings[m.id]
                    if (score === undefined) return null
                    return (
                      <div key={m.id} className="flex items-baseline gap-2.5 text-sm">
                        <span
                          className={`size-2 flex-none translate-y-px rounded-full ${m.color}`}
                          aria-hidden
                        />
                        <span className="w-10 flex-none text-neutral-600">{m.name}</span>
                        <Stars value={score} size="sm" />
                        <span className="w-7 flex-none font-mono text-xs text-neutral-500 tabular-nums">
                          {score.toFixed(1)}
                        </span>
                        <span className="text-neutral-700">{blurbOf(m.id)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {step && (
            <button
              type="button"
              onClick={() => changeStatus.mutate(step.to)}
              disabled={changeStatus.isPending}
              className="app-button app-button-primary"
            >
              {step.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            className="app-button app-button-secondary app-icon-button"
            aria-label="상태 바꾸기 · 삭제"
          >
            …
          </button>
        </div>
      </header>

      {manageOpen && (
        <ManageDialog
          title={work.title}
          status={work.status}
          deletable={deletable}
          lockReason={lockReason}
          onChangeStatus={(next) => changeStatus.mutate(next)}
          onDelete={() => drop.mutate()}
          onClose={() => setManageOpen(false)}
        />
      )}

      <section
        id="my-record"
        className="flex max-w-3xl flex-col gap-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h2 className="text-xl font-semibold">내 기록</h2>
          <p className="mt-1 text-sm text-neutral-500">
            작품 전체에 대한 기록입니다. 모임별 준비는 각 모임에서 작성합니다.
          </p>
        </div>

        {personalSlots.map((slot) => (
          <div
            key={slot.id}
            className="flex flex-col gap-2 border-t border-neutral-100 pt-5 first:border-0 first:pt-0"
          >
            <span className="text-sm font-semibold">
              {slot.name}
              {slot.visibility === Visibility.PRIVATE && ' · 🔒 나만'}
            </span>
            <SlotField
              slot={slot}
              value={myValueOf(slot.id)?.value}
              onSave={(value) =>
                save.mutate({
                  targetId: work.id,
                  slotDefId: slot.id,
                  userId: user.id,
                  value,
                  draft: false,
                })
              }
            />
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <div>
          <h2 className="text-xl font-semibold">함께 읽은 모임</h2>
          <p className="mt-1 text-sm text-neutral-500">언제 만났는지 확인합니다 — 기록은 위에서.</p>
        </div>
        {sessions.length === 0 && <p className="text-sm text-neutral-400">아직 모임이 없습니다.</p>}
        <ul className="flex flex-col">
          {sessions.map((session, i) => (
            <li key={session.id}>
              <Link
                to={`/${study.slug}/w/${session.id}`}
                className="flex items-center gap-4 border-b border-neutral-200 py-4 text-sm hover:bg-neutral-100"
              >
                <span className="w-8 text-center font-mono text-xs text-neutral-400 tabular-nums">
                  {i + 1}
                </span>
                <span className="flex-1">{session.closed ? '마감됨' : '예정'}</span>
                <span className="text-xs text-neutral-500">{formatMeetAt(session.meetAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

/** 선정 이유는 그 책을 담은 사람만 고친다 */
function PickBlock({
  addedBy,
  reason,
  users,
  canEdit,
  onSave,
}: {
  addedBy?: string
  reason?: string
  users: User[]
  canEdit: boolean
  onSave: (reason: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(reason ?? '')

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave(text.trim())
          setEditing(false)
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="왜 고르셨나요"
          className="min-w-60 flex-1 rounded-sm border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-neutral-400"
        />
        <button type="submit" className="app-button app-button-primary">
          저장
        </button>
        <button
          type="button"
          onClick={() => {
            setText(reason ?? '')
            setEditing(false)
          }}
          className="app-button app-button-ghost"
        >
          취소
        </button>
      </form>
    )
  }

  return (
    <div className="flex items-start gap-3">
      <PickNote addedBy={addedBy} reason={reason} users={users} size="md" />
      {canEdit && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="app-button app-button-ghost whitespace-nowrap"
        >
          {reason ? '이유 고치기' : '이유 적기'}
        </button>
      )}
    </div>
  )
}

function ManageDialog({
  title,
  status,
  deletable,
  lockReason,
  onChangeStatus,
  onDelete,
  onClose,
}: {
  title: string
  status: WorkStatus
  deletable: boolean
  lockReason: string
  onChangeStatus: (next: WorkStatus) => void
  onDelete: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [next, setNext] = useState<WorkStatus>(status)
  const [confirming, setConfirming] = useState(false)

  // <dialog> 를 쓰면 Esc 와 포커스 가둠을 브라우저가 해준다
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
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-sm border border-neutral-200 p-0 backdrop:bg-neutral-900/30"
    >
      <div className="flex flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="app-button app-button-ghost app-icon-button"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-neutral-500">상태</span>
          <div className="flex gap-2">
            <select
              value={next}
              onChange={(e) => setNext(e.target.value as WorkStatus)}
              className="flex-1 cursor-pointer rounded-sm border border-neutral-200 px-3 py-2 text-sm"
            >
              <option value={WorkStatus.CANDIDATE}>후보</option>
              <option value={WorkStatus.READING}>읽는 중</option>
              <option value={WorkStatus.DONE}>완료</option>
            </select>
            <button
              type="button"
              disabled={next === status}
              onClick={() => {
                onChangeStatus(next)
                ref.current?.close()
              }}
              className="app-button app-button-primary"
            >
              바꾸기
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4">
          <span className="text-xs font-medium text-neutral-500">삭제</span>

          {!deletable ? (
            <p className="text-xs text-neutral-500">{lockReason}.</p>
          ) : confirming ? (
            <div className="flex items-center gap-2">
              <span className="flex-1 text-xs text-neutral-600">정말 지울까요?</span>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="app-button app-button-secondary"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete()
                  ref.current?.close()
                }}
                className="app-button app-button-danger"
              >
                지우기
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="app-button app-button-secondary self-start hover:text-rose-700"
            >
              작품에서 지우기
            </button>
          )}
        </div>
      </div>
    </dialog>
  )
}
