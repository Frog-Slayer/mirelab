import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { type Rank } from '@/components/RankSticker'
import WorkOverview from '@/components/work/WorkOverview'
import MemberRatings from '@/components/work/MemberRatings'
import RateDialog from '@/components/work/RateDialog'
import StartDialog from '@/components/work/StartDialog'
import ManageDialog from '@/components/work/ManageDialog'
import BlockForm from '@/components/work/BlockForm'
import WorkBlockCard from '@/components/work/WorkBlockCard'
import MyRecordDrawer, { type SaveState } from '@/components/work/MyRecordDrawer'
import NotFoundPage from '@/pages/NotFoundPage'
import { useCurrentUser } from '@/hooks/currentUser'
import { useRecordDrawer } from '@/hooks/useRecordDrawer'
import { useStudy } from '@/hooks/useStudy'
import { ApiError } from '@/lib/api'
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
import { SlotScope, SlotType, Visibility, WorkStatus } from '@/types'

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
  const [recordSaveState, setRecordSaveState] = useState<SaveState>('idle')

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
  /**
   * "내 메모" 서랍의 자동저장. onSuccess 에 refresh(전체 쿼리 무효화)를 걸면 안 된다 —
   * 글자를 치다 잠깐 멈출 때마다 작품·칸·블록·연결된 글·명예의 전당을 통째로 다시 받아온다.
   * 개인 칸 값은 나만 보는 것이라 다시 받아올 이유도 없다(남이 바꾸면 서버가 밀어준다).
   *
   * 대신 지금 무슨 일이 벌어지는지는 서랍 머리글에 적어 보여준다. 자동저장은 조용해도
   * 되지만, 실패까지 조용하면 쓴 글이 어디로 갔는지 알 수 없다.
   */
  const save = useMutation({
    mutationFn: saveValue,
    onMutate: () => setRecordSaveState('saving'),
    onSuccess: () => setRecordSaveState('saved'),
    onError: () => setRecordSaveState('error'),
  })
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

  // 평점·한줄평은 "내 메모" 목록이 아니라 멤버별 평점의 내 카드를 눌러 입력한다.
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
        // 안의 입력칸들은 "한 번 손댄 뒤에는 바깥 값을 따라가지 않는다"(useDebouncedSave).
        // 그 표시는 컴포넌트가 살아 있는 동안 남으므로, 작품이 바뀌거나 (UserSwitcher로)
        // 사용자가 바뀌면 통째로 다시 마운트시켜 그 사람의 내용으로 초기화되게 한다 —
        // 안 그러면 이전 사용자의 내용을 그대로 보여주다 새 사용자 레코드에 덮어쓰게 된다.
        key={`${workId}-${user.id}`}
        open={drawerOpen}
        summarySlot={summarySlot}
        otherSlots={otherPersonalSlots}
        myValueOf={myValueOf}
        onSaveSlot={(slotDefId, value) =>
          // mutate 가 아니라 mutateAsync — 돌려받은 약속으로 저장들이 순서대로 나간다
          save.mutateAsync({ targetId: work.id, slotDefId, value, draft: false })
        }
        draftKeyPrefix={`${workId}:${user.id}`}
        saveState={recordSaveState}
        onToggle={() => setDrawerOpen((v) => !v)}
      />

      {/*
        판 여러 장이 아니라 문서 한 장. 섹션 사이는 테두리가 아니라 가로선 하나와 여백으로
        갈리고(divide-y), 각 섹션이 제 위아래 여백을 들고 있다.

        폭은 바깥 기둥(RootLayout 의 max-w-6xl)을 그대로 쓴다. 긴 글이 담기는 자리만
        각자 제 폭을 좁힌다 — 줄거리의 max-w-prose 처럼.
      */}
      <div className="flex flex-col divide-y divide-neutral-100">
        <WorkOverview
          work={work}
          members={members}
          currentUserId={user.id}
          rank={rank}
          rankYear={rankYear}
          step={step}
          advancing={changeStatus.isPending}
          onAdvance={() => {
            // 후보를 "시작" 하는 건 날짜를 정하는 일이라 곧장 상태만 바꾸지 않는다
            if (work.status === WorkStatus.CANDIDATE) setStartOpen(true)
            else if (step) changeStatus.mutate(step.to)
          }}
          onAddSession={() => setStartOpen(true)}
          onManage={() => setManageOpen(true)}
          onSaveReason={(next) => editReason.mutate(next)}
          // 후보 단계에는 매길 것이 없다(아무도 아직 읽지 않았다) — 그때는 오른쪽 반쪽을
          // 아예 안 열어서 작품 정보가 통째로 넓게 선다.
          aside={
            work.status !== WorkStatus.CANDIDATE ? (
              <MemberRatings
                work={work}
                members={members}
                currentUserId={user.id}
                blurbOf={blurbOf}
                onEditMine={() => setRatingOpen(true)}
              />
            ) : null
          }
        />

        {linkedPosts.length > 0 && (
          <section className="py-10 first:pt-0">
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

        <section className="flex flex-col gap-6 py-10 first:pt-0">
          <div>
            <h2 className="text-xl font-semibold">함께 쓰는 기록</h2>
            <p className="mt-1 text-sm text-neutral-500">
              이 작품에 대해 다같이 자유롭게 남겨보세요.
            </p>
          </div>

          {blockApiReady ? (
            <div className="flex flex-col gap-8">
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

      {/*
        창들은 문서 바깥에 둔다. divide-y 가 걸린 칼럼 안에 있으면 열릴 때마다 없던
        가로선이 하나 생긴다 — 화면 어딘가에 그려지는 것도 그 칼럼의 한 칸이기 때문.
      */}
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
    </>
  )
}
