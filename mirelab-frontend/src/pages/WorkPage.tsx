import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Cover from '@/components/Cover'
import Stars from '@/components/Stars'
import RankSticker, { type Rank } from '@/components/RankSticker'
import PickBlock from '@/components/work/PickBlock'
import RateDialog from '@/components/work/RateDialog'
import StartDialog from '@/components/work/StartDialog'
import ManageDialog from '@/components/work/ManageDialog'
import BlockForm from '@/components/work/BlockForm'
import WorkBlockCard from '@/components/work/WorkBlockCard'
import MyRecordDrawer from '@/components/work/MyRecordDrawer'
import { useCurrentUser } from '@/hooks/currentUser'
import { useRecordDrawer } from '@/hooks/useRecordDrawer'
import { useStudy } from '@/hooks/useStudy'
import {
  addSession,
  getHallOfFame,
  getWork,
  getWorkSlots,
  removeWork,
  saveValue,
  setWorkStatus,
  updateWorkReason,
} from '@/mocks/api'
import { formatRating } from '@/lib/format'
import {
  addWorkBlock,
  getWorkBlocks,
  isWorkBlockApiReady,
  removeWorkBlock,
  updateWorkBlockTitle,
} from '@/lib/workBlockApi'
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
  const [startOpen, setStartOpen] = useState(false)
  const { open: drawerOpen, setOpen: setDrawerOpen } = useRecordDrawer()
  const [creatingBlock, setCreatingBlock] = useState(false)

  // 드로어 열림 상태는 RootLayout 에 있어서 페이지를 떠나도 안 꺼진다 —
  // 다른 화면에서 main 이 계속 밀려 있는 것처럼 보이니 나갈 때 접어둔다.
  useEffect(() => {
    return () => setDrawerOpen(false)
  }, [setDrawerOpen])

  const { data } = useQuery({ queryKey: ['work', workId], queryFn: () => getWork(workId) })
  const { data: workSlots } = useQuery({
    queryKey: ['workSlots', study?.id, workId],
    queryFn: () => getWorkSlots(study!.id, workId),
    enabled: !!study,
  })
  const blockApiReady = isWorkBlockApiReady(workId)
  const { data: blocks = [] } = useQuery({
    queryKey: ['workBlocks', workId],
    queryFn: () => getWorkBlocks(workId),
    enabled: blockApiReady,
  })
  // 명예의 전당과 같은 기준(장르 구분 없는 전체 순위)으로 계산해 어긋나지 않게 한다.
  const { data: hallOfFame } = useQuery({
    queryKey: ['hallOfFame', study?.id],
    queryFn: () => getHallOfFame(study!.id),
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
  const startReading = useMutation({
    mutationFn: addSession,
    onSuccess: () => {
      refresh()
      setStartOpen(false)
    },
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
  const editBlock = useMutation({ mutationFn: updateWorkBlockTitle, onSuccess: refresh })
  const deleteBlock = useMutation({ mutationFn: removeWorkBlock, onSuccess: refresh })

  if (!data || !study || !user) return <p className="text-sm text-neutral-400">불러오는 중…</p>

  const { work, sessions } = data
  const slots = workSlots?.slots ?? []
  const values = workSlots?.values ?? []
  const myValueOf = (slotId: string) =>
    values.find((value) => value.slotDefId === slotId && value.userId === user.id)
  const step = nextStep[work.status]

  const hallIndex = hallOfFame?.findIndex((w) => w.id === work.id) ?? -1
  const hallRank = hallIndex >= 0 && hallIndex < 9 ? ((hallIndex + 1) as Rank) : null

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
    <>
      <MyRecordDrawer
        open={drawerOpen}
        summarySlot={summarySlot}
        otherSlots={otherPersonalSlots}
        myValueOf={myValueOf}
        onSaveSlot={(slotDefId, value) =>
          save.mutate({ targetId: work.id, slotDefId, userId: user.id, value, draft: false })
        }
        onToggle={() => setDrawerOpen((v) => !v)}
      />

      <div className="flex flex-col gap-10">
        <header className="relative flex flex-col gap-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          {hallRank && <RankSticker rank={hallRank} className="-top-2 -left-2 -rotate-6" />}

          <div className="flex items-center justify-end gap-2">
            {work.status === WorkStatus.READING && (
              <button
                type="button"
                onClick={() => setStartOpen(true)}
                className="app-button app-button-secondary"
              >
                + 일정 추가
              </button>
            )}
            {step && (
              <button
                type="button"
                onClick={() =>
                  work.status === WorkStatus.CANDIDATE
                    ? setStartOpen(true)
                    : changeStatus.mutate(step.to)
                }
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

          {startOpen && (
            <StartDialog
              title={work.status === WorkStatus.CANDIDATE ? '언제 시작하나요?' : '일정 추가'}
              submitLabel={work.status === WorkStatus.CANDIDATE ? '시작하기' : '추가하기'}
              onStart={(meetAt) =>
                startReading.mutate({ studyId: study.id, workId: work.id, meetAt })
              }
              onClose={() => setStartOpen(false)}
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
          <div>
            <h2 className="text-xl font-semibold">함께 쓰는 기록</h2>
            <p className="mt-1 text-sm text-neutral-500">
              이 작품에 대해 다같이 자유롭게 남겨보세요.
            </p>
          </div>

          {blockApiReady ? (
            <div className="flex flex-col gap-4">
              {blocks.map((block) => (
                <WorkBlockCard
                  key={block.id}
                  block={block}
                  author={members.find((m) => m.id === block.authorId)}
                  currentUser={user}
                  canEdit={block.authorId === user.id}
                  onSaveTitle={(title) => editBlock.mutate({ id: block.id, title })}
                  onDelete={() => deleteBlock.mutate(block.id)}
                />
              ))}

              {creatingBlock ? (
                <BlockForm
                  onSave={(title) => addBlock.mutate({ workId: work.id, authorId: user.id, title })}
                  onCancel={() => setCreatingBlock(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setCreatingBlock(true)}
                  className="flex items-center justify-center rounded-lg border border-dashed border-neutral-300 p-4 text-lg text-neutral-400 transition-colors hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-600"
                  aria-label="새 블록 추가"
                >
                  +
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-neutral-400">
              이 작품은 아직 실시간 기록 백엔드로 옮겨지지 않았습니다 — 목 데이터라 여기서는 안
              됩니다.
            </p>
          )}
        </section>
      </div>
    </>
  )
}
