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
  addWorkBlock,
  getWork,
  getWorkBlocks,
  getWorkSlots,
  removeWork,
  removeWorkBlock,
  saveValue,
  setWorkStatus,
  updateWorkBlock,
  updateWorkReason,
} from '@/mocks/api'
import { formatDate, formatMeetAt, formatRating } from '@/lib/format'
import type { SlotDef, SlotValue, User, WorkBlock } from '@/types'
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
  const [ratingOpen, setRatingOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [creatingBlock, setCreatingBlock] = useState(false)

  const { data } = useQuery({ queryKey: ['work', workId], queryFn: () => getWork(workId) })
  const { data: workSlots } = useQuery({
    queryKey: ['workSlots', study?.id, workId],
    queryFn: () => getWorkSlots(study!.id, workId),
    enabled: !!study,
  })
  const { data: blocks = [] } = useQuery({
    queryKey: ['workBlocks', workId],
    queryFn: () => getWorkBlocks(workId),
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
  const addBlock = useMutation({
    mutationFn: addWorkBlock,
    onSuccess: () => {
      refresh()
      setCreatingBlock(false)
    },
  })
  const editBlock = useMutation({ mutationFn: updateWorkBlock, onSuccess: refresh })
  const deleteBlock = useMutation({ mutationFn: removeWorkBlock, onSuccess: refresh })

  if (!data || !study || !user) return <p className="text-sm text-neutral-400">불러오는 중…</p>

  const { work, sessions } = data
  const slots = workSlots?.slots ?? []
  const values = workSlots?.values ?? []
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

  // 평점·한줄평은 "내 기록" 목록이 아니라 멤버별 평점의 내 카드를 눌러 입력한다.
  const ratingSlot = slots.find((s) => s.type === SlotType.RATING)
  const blurbSlot = slots.find(
    (s) => s.type === SlotType.TEXT_SHORT && s.visibility !== Visibility.PRIVATE,
  )
  const consolidatedIds = new Set(
    [ratingSlot?.id, blurbSlot?.id].filter((id): id is string => !!id),
  )
  const personalSlots = slots.filter(
    (slot) => slot.scope === SlotScope.PERSONAL && !consolidatedIds.has(slot.id),
  )
  const summarySlot = personalSlots.find((slot) => slot.name === '내 요약')
  const otherPersonalSlots = personalSlots.filter((slot) => slot.id !== summarySlot?.id)
  const blurbOf = (userId: string) => {
    const v = values.find((x) => x.slotDefId === blurbSlot?.id && x.userId === userId)
    return v && 'text' in v.value ? v.value.text : ''
  }

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-end gap-2">
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

        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex gap-6">
            <div className="w-40 flex-none sm:w-48">
              <Cover work={work} size="lg" />
            </div>
            <div className="flex flex-col gap-2.5 pt-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-neutral-400">
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
                <p className="min-h-[3.75rem] max-w-xl text-sm leading-relaxed text-neutral-600">
                  {work.description}
                </p>
              )}
              <div className="mt-auto pt-2">
                <PickBlock
                  addedBy={work.addedBy}
                  reason={work.reason}
                  users={members}
                  canEdit={work.addedBy === user.id}
                  onSave={(next) => editReason.mutate(next)}
                />
              </div>
            </div>
          </div>

          {work.voterCount > 0 && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-3">
                <span className="font-serif text-4xl font-semibold tabular-nums">
                  {formatRating(work.average)}
                </span>
                <Stars value={work.average} />
              </div>
              <span className="text-sm text-neutral-500">{work.voterCount}명 평가</span>
            </div>
          )}
        </div>

        {work.status !== WorkStatus.CANDIDATE && (
          <div className="border-t border-neutral-100 pt-5">
            <span className="font-mono text-[10px] tracking-[0.13em] text-neutral-400 uppercase">
              멤버별 평점
            </span>
            <div className="mt-3 grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {members.map((m) => {
                const score = work.ratings[m.id]
                const mine = m.id === user.id
                const content = (
                  <>
                    <span className="absolute top-2.5 right-3 flex items-center gap-1 text-xs text-neutral-500">
                      {score === undefined ? (
                        <span className="text-neutral-300">아직</span>
                      ) : (
                        <>
                          <span aria-hidden>★</span>
                          <span className="font-mono tabular-nums">{score.toFixed(1)}</span>
                        </>
                      )}
                    </span>
                    <div className="flex items-center gap-1.5 pr-10">
                      <span className="truncate text-sm font-medium text-neutral-800">
                        {m.name}
                      </span>
                    </div>
                    {score !== undefined && blurbOf(m.id) && (
                      <p className="text-xs text-neutral-600">{blurbOf(m.id)}</p>
                    )}
                  </>
                )
                return mine ? (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setRatingOpen(true)}
                    className="relative flex h-full cursor-pointer flex-col gap-1.5 rounded-lg border border-emerald-300 bg-white p-3 text-left transition-colors hover:border-emerald-500"
                  >
                    {content}
                  </button>
                ) : (
                  <div
                    key={m.id}
                    className="relative flex h-full flex-col gap-1.5 rounded-lg border border-neutral-200 bg-white p-3"
                  >
                    {content}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {ratingOpen && ratingSlot && (
          <RateDialog
            ratingSlot={ratingSlot}
            blurbSlot={blurbSlot}
            ratingValue={myValueOf(ratingSlot.id)?.value}
            blurbValue={blurbSlot && myValueOf(blurbSlot.id)?.value}
            onSaveSlot={(slotDefId, value) =>
              save.mutate({ targetId: work.id, slotDefId, userId: user.id, value, draft: false })
            }
            onClose={() => setRatingOpen(false)}
          />
        )}
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

      <section className="flex flex-col gap-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">함께 쓰는 기록</h2>
            <p className="mt-1 text-sm text-neutral-500">
              이 작품에 대해 다같이 자유롭게 남겨보세요.
            </p>
          </div>
          {!creatingBlock && (
            <button
              type="button"
              onClick={() => setCreatingBlock(true)}
              className="app-button app-button-secondary flex-none"
            >
              + 새 블록
            </button>
          )}
        </div>

        {creatingBlock && (
          <BlockForm
            onSave={(title, body) =>
              addBlock.mutate({ workId: work.id, authorId: user.id, title, body })
            }
            onCancel={() => setCreatingBlock(false)}
          />
        )}

        <div className="flex flex-col gap-4">
          {blocks.map((block) => (
            <WorkBlockCard
              key={block.id}
              block={block}
              author={members.find((m) => m.id === block.authorId)}
              canEdit={block.authorId === user.id}
              onSave={(title, body) => editBlock.mutate({ id: block.id, title, body })}
              onDelete={() => deleteBlock.mutate(block.id)}
            />
          ))}
          {blocks.length === 0 && !creatingBlock && (
            <p className="text-sm text-neutral-400">
              아직 아무도 쓰지 않았습니다. 먼저 남겨보세요.
            </p>
          )}
        </div>
      </section>

      <button
        type="button"
        onClick={() => setDrawerOpen((open) => !open)}
        aria-label={drawerOpen ? '내 기록 닫기' : '내 기록 열기'}
        className={`fixed top-[11vh] bottom-[5vh] z-40 flex w-6 cursor-pointer items-center justify-center rounded-r-2xl border border-l-0 border-neutral-200 bg-white text-neutral-400 shadow-lg transition-[left,background-color,color] duration-150 ease-out hover:bg-emerald-50 hover:text-emerald-700 ${
          drawerOpen ? 'left-[min(24rem,100vw)]' : 'left-0'
        }`}
      >
        <span aria-hidden>{drawerOpen ? '‹' : '›'}</span>
      </button>

      <MyRecordDrawer
        open={drawerOpen}
        summarySlot={summarySlot}
        otherSlots={otherPersonalSlots}
        myValueOf={myValueOf}
        onSaveSlot={(slotDefId, value) =>
          save.mutate({ targetId: work.id, slotDefId, userId: user.id, value, draft: false })
        }
        onClose={() => setDrawerOpen(false)}
      />

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
          className="whitespace-nowrap text-sm font-medium text-neutral-400 underline decoration-neutral-300 underline-offset-2 transition-colors hover:text-neutral-600 hover:decoration-neutral-500"
        >
          {reason ? '수정' : '이유 적기'}
        </button>
      )}
    </div>
  )
}

/** 멤버별 평점의 내 카드를 누르면 뜬다 — 평점·한줄평을 한 곳에서 입력한다 */
function RateDialog({
  ratingSlot,
  blurbSlot,
  ratingValue,
  blurbValue,
  onSaveSlot,
  onClose,
}: {
  ratingSlot: SlotDef
  blurbSlot?: SlotDef
  ratingValue?: SlotValue['value']
  blurbValue?: SlotValue['value']
  onSaveSlot: (slotDefId: string, value: SlotValue['value']) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
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
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-sm border border-neutral-200 p-0 backdrop:bg-neutral-900/30"
    >
      <div className="flex flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-base font-semibold">내 평가</h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="app-button app-button-ghost app-icon-button"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-semibold">{ratingSlot.name}</span>
          <SlotField
            slot={ratingSlot}
            value={ratingValue}
            onSave={(value) => onSaveSlot(ratingSlot.id, value)}
          />
        </div>

        {blurbSlot && (
          <div className="flex flex-col gap-2 border-t border-neutral-100 pt-4">
            <span className="text-sm font-semibold">{blurbSlot.name}</span>
            <SlotField
              slot={blurbSlot}
              value={blurbValue}
              onSave={(value) => onSaveSlot(blurbSlot.id, value)}
            />
          </div>
        )}
      </div>
    </dialog>
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

/** 새 블록 작성 폼 — 카드 수정 폼과 모양을 맞춘다 */
function BlockForm({
  initialTitle = '',
  initialBody = '',
  onSave,
  onCancel,
}: {
  initialTitle?: string
  initialBody?: string
  onSave: (title: string, body: string) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState(initialBody)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim() || !body.trim()) return
        onSave(title.trim(), body.trim())
      }}
      className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4"
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목"
        className="rounded-sm border border-neutral-200 px-3 py-1.5 text-sm font-medium outline-none focus:border-neutral-400"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="내용을 자유롭게 적어보세요"
        className="rounded-sm border border-neutral-200 px-3 py-2 text-sm leading-relaxed outline-none focus:border-neutral-400"
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="app-button app-button-ghost">
          취소
        </button>
        <button type="submit" className="app-button app-button-primary">
          저장
        </button>
      </div>
    </form>
  )
}

/** 함께 쓰는 블록 하나. 쓴 사람만 고치거나 지울 수 있다 */
function WorkBlockCard({
  block,
  author,
  canEdit,
  onSave,
  onDelete,
}: {
  block: WorkBlock
  author?: User
  canEdit: boolean
  onSave: (title: string, body: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  if (editing) {
    return (
      <BlockForm
        initialTitle={block.title}
        initialBody={block.body}
        onSave={(title, body) => {
          onSave(title, body)
          setEditing(false)
        }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-sm font-semibold">{block.title}</h3>
        {canEdit &&
          (confirming ? (
            <div className="flex flex-none items-center gap-2 text-xs">
              <span className="text-neutral-500">정말 지울까요?</span>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="app-button app-button-secondary"
              >
                취소
              </button>
              <button type="button" onClick={onDelete} className="app-button app-button-danger">
                지우기
              </button>
            </div>
          ) : (
            <div className="flex flex-none gap-2 text-xs">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-neutral-400 underline decoration-neutral-300 underline-offset-2 transition-colors hover:text-neutral-600 hover:decoration-neutral-500"
              >
                수정
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="text-neutral-400 underline decoration-neutral-300 underline-offset-2 transition-colors hover:text-rose-600 hover:decoration-rose-400"
              >
                삭제
              </button>
            </div>
          ))}
      </div>
      <p className="whitespace-pre-wrap text-sm text-neutral-600">{block.body}</p>
      <div className="flex items-center gap-1.5 text-xs text-neutral-400">
        {author && <span className={`size-1.5 rounded-full ${author.color}`} aria-hidden />}
        <span>{author?.name ?? '알 수 없음'}</span>
        <span aria-hidden>·</span>
        <span>{formatDate(block.createdAt)}</span>
      </div>
    </div>
  )
}

/**
 * 내 기록을 좌측 드로어에 담는다 — 내 서재와 값이 같은 편집 공간이라
 * 이 페이지에서는 큰 자리를 차지하지 않고 필요할 때만 펼쳐 본다.
 */
function MyRecordDrawer({
  open,
  summarySlot,
  otherSlots,
  myValueOf,
  onSaveSlot,
  onClose,
}: {
  open: boolean
  summarySlot?: SlotDef
  otherSlots: SlotDef[]
  myValueOf: (slotId: string) => SlotValue | undefined
  onSaveSlot: (slotDefId: string, value: SlotValue['value']) => void
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open && e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const allSlots = summarySlot ? [summarySlot, ...otherSlots] : otherSlots

  return (
    <aside
      className={`fixed top-[11vh] bottom-[5vh] left-0 z-40 flex w-[min(24rem,100vw)] flex-col overflow-y-auto border border-l-0 border-neutral-200 bg-white shadow-xl transition-transform duration-150 ease-out motion-reduce:transition-none ${
        open ? 'translate-x-0' : 'pointer-events-none -translate-x-full'
      }`}
    >
      <div className="sticky top-0 flex flex-col border-b border-neutral-200 bg-white px-5 py-3">
        <span className="font-mono text-[10px] tracking-[0.13em] text-neutral-400 uppercase">
          나만
        </span>
        <span className="text-sm font-medium">내 기록</span>
      </div>

      <div className="flex flex-col gap-6 p-5">
        {allSlots.map((slot) => (
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
              onSave={(value) => onSaveSlot(slot.id, value)}
            />
          </div>
        ))}
        {allSlots.length === 0 && (
          <p className="text-sm text-neutral-400">아직 작성할 수 있는 기록 항목이 없습니다.</p>
        )}
      </div>
    </aside>
  )
}
