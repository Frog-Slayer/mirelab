import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, MoreHorizontal, Plus, Star } from 'lucide-react'
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
import NotFoundPage from '@/pages/NotFoundPage'
import { useCurrentUser } from '@/hooks/currentUser'
import { useRecordDrawer } from '@/hooks/useRecordDrawer'
import { useStudy } from '@/hooks/useStudy'
import { ApiError } from '@/lib/api'
import { formatRating } from '@/lib/format'
import { completedYearOf, publishedRatingsOf, topRanksByYear } from '@/lib/workRanking'
import { getWorkPosts } from '@/lib/postApi'
import { addSession } from '@/lib/sessionApi'
import { getWorkSlots, openWorkSlotEvents, saveValue, setRatingPublished } from '@/lib/slotApi'
import {
  addWorkBlock,
  getWorkBlocks,
  isWorkBlockApiReady,
  removeWorkBlock,
  updateWorkBlockTitle,
} from '@/lib/workBlockApi'
import {
  type RankedWork,
  getHallOfFame,
  getWork,
  removeWork,
  setWorkStatus,
  updateWorkInfo,
  updateWorkReason,
} from '@/lib/workApi'
import { SlotScope, SlotType, Visibility, WorkKind, WorkStatus } from '@/types'

const statusLabel: Record<string, string> = {
  [WorkStatus.CANDIDATE]: '후보',
  [WorkStatus.READING]: '읽는 중',
  [WorkStatus.DONE]: '완료',
}

/**
 * 별점 공개의 묘미는 다 같이 "하나, 둘, 셋" 하고 여는 그 순간이라, 그때만큼은 밀리면 안 된다.
 * 그건 서버가 밀어주는 신호(openWorkSlotEvents)가 맡고, 폴링은 그 신호가 끊겼을 때를 위한
 * 보험이다 — 그래서 스트림이 붙어 있는 동안은 느긋하게만 본다.
 *
 * 보험으로 돌 때도 종일 초당 왕복을 돌릴 수는 없으니(작품 상세 한 번이 서버 쿼리 여러 개다),
 * "열리기를 기다리는 중"일 때만 촘촘히 본다. 매긴 사람이 다 공개해버렸으면 기다릴 게 없다.
 */
const REVEAL_POLL_MS = 1_000
const IDLE_POLL_MS = 30_000

function ratingPollMs(work: RankedWork | undefined, live: boolean): number {
  if (live || !work || work.status === WorkStatus.CANDIDATE) return IDLE_POLL_MS
  const pending = work.ratedUserIds.length > work.publishedRatingUserIds.length
  return pending ? REVEAL_POLL_MS : IDLE_POLL_MS
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
  const [publishError, setPublishError] = useState<string | null>(null)
  const [startOpen, setStartOpen] = useState(false)
  const { open: drawerOpen, setOpen: setDrawerOpen } = useRecordDrawer()
  const [creatingBlock, setCreatingBlock] = useState(false)
  /** 서버가 신호를 밀어주는 접속이 살아 있는지 — 끊긴 동안만 폴링이 촘촘해진다 */
  const [live, setLive] = useState(false)

  // 드로어 열림 상태는 RootLayout 에 있어서 페이지를 떠나도 안 꺼진다 —
  // 다른 화면에서 main 이 계속 밀려 있는 것처럼 보이니 나갈 때 접어둔다.
  useEffect(() => {
    return () => setDrawerOpen(false)
  }, [setDrawerOpen])

  // 누가 평점을 공개하거나 한줄평을 고치면 서버가 곧바로 알려준다. 신호에는 내용이 없으니
  // (무엇이 보이는지는 사람마다 다르다) 이 작품이 걸린 쿼리만 다시 받아오게 한다.
  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    return openWorkSlotEvents(workId, {
      onEvent: () => {
        void qc.invalidateQueries({ queryKey: ['work', workId] })
        void qc.invalidateQueries({ queryKey: ['workSlots', workId] })
        // 공개된 평점이 늘면 평균이 바뀌고, 그러면 명예의 전당 순위도 따라 바뀐다
        void qc.invalidateQueries({ queryKey: ['hallOfFame'] })
      },
      onConnectedChange: setLive,
    })
  }, [qc, workId, userId])

  const { data, isPending } = useQuery({
    queryKey: ['work', workId],
    queryFn: () => getWork(workId),
    // 다른 멤버가 평점을 공개하거나 공개 평점을 수정하면 화면 전환 없이 반영한다.
    refetchInterval: (query) => ratingPollMs(query.state.data?.work, live),
  })
  const { data: workSlots } = useQuery({
    queryKey: ['workSlots', workId, user?.id],
    queryFn: () => getWorkSlots(workId),
    enabled: !!user,
    // 남의 한줄평은 점수와 달리 이쪽 응답에 실려 온다 — 같이 갱신해야 별점만 바뀌고
    // 그 밑 한줄평은 옛것 그대로인 어긋난 카드가 안 나온다.
    refetchInterval: ratingPollMs(data?.work, live),
  })
  const blockApiReady = isWorkBlockApiReady(workId)
  const { data: blocks = [] } = useQuery({
    queryKey: ['workBlocks', workId],
    queryFn: () => getWorkBlocks(workId),
    enabled: blockApiReady,
  })
  const { data: linkedPosts = [] } = useQuery({
    queryKey: ['workPosts', workId, user?.id],
    queryFn: () => getWorkPosts(workId),
    enabled: !!user,
  })
  // 명예의 전당과 같은 기준(장르 구분 없는 전체 순위)으로 계산해 어긋나지 않게 한다.
  const { data: hallOfFame } = useQuery({
    queryKey: ['hallOfFame', study?.slug],
    queryFn: () => getHallOfFame(study!.slug),
    enabled: !!study,
  })

  const refresh = () => qc.invalidateQueries()
  const changeStatus = useMutation({
    mutationFn: (status: WorkStatus) => setWorkStatus(workId, status),
    onSuccess: refresh,
  })
  const editReason = useMutation({
    mutationFn: (reason: string) => updateWorkReason({ workId, reason }),
    onSuccess: refresh,
  })
  const editInfo = useMutation({
    mutationFn: updateWorkInfo,
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

  if (!isPending && data === null) return <NotFoundPage />
  if (!data || !study || !user) return <p className="text-sm text-neutral-500">불러오는 중…</p>

  const { work } = data
  const slots = workSlots?.slots ?? []
  const values = workSlots?.values ?? []
  const myValueOf = (slotId: string) =>
    values.find((value) => value.slotDefId === slotId && value.userId === user.id)
  const step = nextStep[work.status]

  /**
   * 순위는 "다 읽은 그 해" 안에서 매긴다 — 홈 아카이브가 연도별로 묶여 있으므로 같은 축을
   * 쓴다([topRanksByYear]). 올해 것은 연도를 굳이 밝히지 않고, 지난 해 것만 "2024년 2위"
   * 처럼 근거를 붙여 어느 해 기준인지 드러낸다.
   */
  const yearRanks = topRanksByYear(
    (hallOfFame ?? []).map((w) => ({
      id: w.id,
      average: w.average,
      voterCount: w.voterCount,
      finishedAt: w.finishedAt,
      publishedRatings: publishedRatingsOf(w),
    })),
  )
  const rank = (yearRanks.get(work.id) ?? null) as Rank | null
  const rankYear = completedYearOf(work)
  const showRankYear = rankYear !== null && rankYear !== new Date().getFullYear()

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

  // RateDialog 는 저장을 눌러야 한 번에 반영한다. 별점·한줄평은 서로 관계가 없으니
  // 동시에 보내고, 공개 전환만 별점이 서버에 먼저 있어야 하니 그 뒤에 보낸다.
  // useMutation 의 onSuccess(refresh)는 쿼리 전체를 다시 받아오는 무거운 동작이라
  // 그걸 매 단계마다 기다리면(mutateAsync) 유난히 느려진다 — 그래서 여기서는 실제
  // 저장 요청만 기다리고, 화면 갱신은 다 끝난 뒤 한 번만 한다.
  const saveRating = async (input: { rating?: number; blurb?: string; published?: boolean }) => {
    setPublishError(null)
    try {
      await Promise.all([
        input.rating !== undefined && ratingSlot
          ? saveValue({
              targetId: work.id,
              slotDefId: ratingSlot.id,
              value: { n: input.rating },
              draft: false,
            })
          : Promise.resolve(),
        input.blurb !== undefined && blurbSlot
          ? saveValue({
              targetId: work.id,
              slotDefId: blurbSlot.id,
              value: { text: input.blurb },
              draft: false,
            })
          : Promise.resolve(),
      ])
      if (input.published !== undefined) {
        await setRatingPublished(workId, input.published)
      }
    } catch (error) {
      setPublishError(
        error instanceof ApiError && error.status === 404
          ? '별점을 먼저 저장한 뒤에 공개할 수 있어요.'
          : '저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.',
      )
      throw error
    } finally {
      refresh()
    }
  }

  return (
    <>
      <MyRecordDrawer
        // BlockNote 에디터(내 요약)는 마운트 시점의 초기값만 읽으므로, 작품이 바뀌거나
        // (UserSwitcher로) 사용자가 바뀌면 통째로 다시 마운트시켜 그 사람의 내용으로
        // 초기화되게 한다 — 안 그러면 이전 사용자의 내용을 그대로 보여주다 새 사용자
        // 레코드에 덮어쓰게 된다.
        key={`${workId}-${user.id}`}
        open={drawerOpen}
        summarySlot={summarySlot}
        otherSlots={otherPersonalSlots}
        myValueOf={myValueOf}
        onSaveSlot={(slotDefId, value) =>
          save.mutate({ targetId: work.id, slotDefId, value, draft: false })
        }
        onToggle={() => setDrawerOpen((v) => !v)}
      />

      <div className="flex flex-col gap-12">
        <header className="app-card relative flex flex-col gap-6 p-6 sm:p-8">
          {rank && (
            <>
              <RankSticker rank={rank} className="-top-2 -left-2 -rotate-6" />
              {showRankYear && (
                <span className="absolute -top-1 left-11 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-neutral-600 ring-1 ring-neutral-950/[0.08]">
                  {rankYear}년 {rank}위
                </span>
              )}
            </>
          )}

          <div className="flex items-center justify-end gap-2">
            {work.status === WorkStatus.READING && (
              <button
                type="button"
                onClick={() => setStartOpen(true)}
                className="app-button app-button-secondary"
              >
                <CalendarPlus aria-hidden className="size-4" strokeWidth={1.75} />
                일정 추가
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
              aria-label="정보 수정 · 상태 바꾸기 · 삭제"
            >
              <MoreHorizontal aria-hidden className="size-4" strokeWidth={2} />
            </button>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex gap-6">
              <div className="w-40 flex-none sm:w-48">
                <Cover work={work} size="lg" />
              </div>
              <div className="flex flex-col gap-2.5 pt-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-neutral-500">
                    {work.kind === WorkKind.MOVIE ? 'Movie' : 'Book'}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      work.status === WorkStatus.READING
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {statusLabel[work.status]}
                  </span>
                </div>
                <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
                  {work.title}
                </h1>
                <p className="text-base text-neutral-500">
                  {work.author} · {work.year}
                </p>
                {work.actors && work.actors.length > 0 && (
                  <p className="text-xs text-neutral-500">출연 {work.actors.join(' · ')}</p>
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

            <div className="flex min-h-14 flex-col items-end justify-center gap-1">
              {work.voterCount > 0 ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="font-serif text-4xl font-semibold tabular-nums">
                      {formatRating(work.average)}
                    </span>
                    <Stars value={work.average} />
                  </div>
                  <span className="text-sm text-neutral-500">{work.voterCount}명 평가</span>
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <span>평가 없음</span>
                  <Stars value={0} />
                </div>
              )}
            </div>
          </div>

          {work.status !== WorkStatus.CANDIDATE && (
            <div className="app-panel p-4 sm:p-5">
              {/*
                예전에는 mono·대문자·넓은 자간의 잔글씨였다. 한글에는 mono 도 대문자도 없어서
                "멤버별 평점" 이 그냥 흐린 잔글씨로만 보였다 — 크기와 굵기로 소제목임을 밝힌다.
              */}
              <span className="text-xs font-semibold text-neutral-500">멤버별 평점</span>
              <div className="mt-3 grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {members.map((m) => {
                  // 남의 점수는 공개한 것만 내려오므로, 점수가 없다고 안 매긴 건 아니다 —
                  // ratedUserIds 로 "비공개로 매김"과 "아직 안 매김"을 갈라 보여준다.
                  const score = work.ratings[m.id]
                  const mine = m.id === user.id
                  const rated = work.ratedUserIds.includes(m.id)
                  const published = work.publishedRatingUserIds.includes(m.id)
                  const content = (
                    <>
                      <span className="absolute top-2.5 right-3 flex items-center gap-1 text-xs text-neutral-500">
                        {score === undefined ? (
                          <span className="text-neutral-400">{rated ? '비공개' : '아직'}</span>
                        ) : (
                          <>
                            <Star aria-hidden className="size-3 fill-amber-400 text-amber-400" />
                            <span className="tabular-nums">{score.toFixed(1)}</span>
                          </>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5 pr-10">
                        {mine ? (
                          <span className="truncate text-sm font-medium text-neutral-800">
                            {m.name}
                          </span>
                        ) : (
                          <Link
                            to={`/@${m.username}`}
                            className="truncate text-sm font-medium text-neutral-800 hover:underline"
                          >
                            {m.name}
                          </Link>
                        )}
                        {/* 남의 카드는 점수 자리에 이미 공개 여부가 드러나니, 뱃지는 내 것만 */}
                        {mine && rated && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                              published
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-neutral-100 text-neutral-500'
                            }`}
                          >
                            {published ? '공개' : '비공개'}
                          </span>
                        )}
                      </div>
                      {/* 한줄평 공개 여부는 그 칸의 visibility 가 이미 정한다 — 평점을
                          비공개로 뒀다고 같이 가릴 일이 아니다 */}
                      {blurbOf(m.id) && <p className="text-xs text-neutral-600">{blurbOf(m.id)}</p>}
                    </>
                  )
                  return mine ? (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setRatingOpen(true)}
                      className="app-tile relative flex h-full cursor-pointer flex-col gap-1.5 p-3 text-left ring-emerald-400/70 hover:ring-emerald-500"
                    >
                      {content}
                    </button>
                  ) : (
                    <div key={m.id} className="app-tile relative flex h-full flex-col gap-1.5 p-3">
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
              published={work.publishedRatingUserIds.includes(user.id)}
              publishError={publishError}
              onSave={saveRating}
              onClose={() => {
                setPublishError(null)
                setRatingOpen(false)
              }}
            />
          )}

          {startOpen && (
            <StartDialog
              title={work.status === WorkStatus.CANDIDATE ? '언제 시작하나요?' : '일정 추가'}
              submitLabel={work.status === WorkStatus.CANDIDATE ? '시작하기' : '추가하기'}
              onStart={(meetAt) => startReading.mutate({ workId: work.id, meetAt })}
              onClose={() => setStartOpen(false)}
            />
          )}
        </header>

        {manageOpen && (
          <ManageDialog
            kind={work.kind}
            title={work.title}
            author={work.author}
            description={work.description ?? ''}
            coverUrl={work.coverUrl ?? ''}
            year={work.year}
            status={work.status}
            onSaveInfo={(info) => editInfo.mutate({ workId: work.id, ...info })}
            onChangeStatus={(next) => changeStatus.mutate(next)}
            onDelete={() => drop.mutate()}
            onClose={() => setManageOpen(false)}
          />
        )}

        {linkedPosts.length > 0 && (
          <section className="app-card p-6">
            <h2 className="text-xl font-semibold">이 책에 연결된 글</h2>
            <div className="mt-4 divide-y divide-neutral-100">
              {linkedPosts.map((post) => (
                <Link
                  key={post.id}
                  to={`/@${post.author.username}/posts/${post.id}`}
                  className="block py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium hover:underline">{post.title || '제목 없음'}</h3>
                    {!post.published && <span className="text-xs text-neutral-500">초안</span>}
                  </div>
                  {post.excerpt && (
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{post.excerpt}</p>
                  )}
                  <p className="mt-2 text-xs text-neutral-500">{post.author.name}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="app-card flex flex-col gap-6 p-6">
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
                  onSave={(title) => addBlock.mutate({ workId: work.id, title })}
                  onCancel={() => setCreatingBlock(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setCreatingBlock(true)}
                  className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-neutral-300 p-4 text-neutral-500 transition-colors hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
                  aria-label="새 블록 추가"
                >
                  <Plus aria-hidden className="size-5" strokeWidth={1.75} />
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">
              이 작품은 아직 실시간 기록 백엔드로 옮겨지지 않았습니다 — 목 데이터라 여기서는 안
              됩니다.
            </p>
          )}
        </section>
      </div>
    </>
  )
}
