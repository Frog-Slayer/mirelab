import { CalendarPlus, MoreHorizontal } from 'lucide-react'
import Cover from '@/components/Cover'
import Stars from '@/components/Stars'
import RankSticker, { type Rank } from '@/components/RankSticker'
import PickBlock from '@/components/work/PickBlock'
import { formatRating } from '@/lib/format'
import { kindLabel } from '@/lib/workKind'
import { statusLabel } from '@/lib/workStatus'
import type { RankedWork } from '@/lib/workApi'
import type { User } from '@/types'
import { WorkStatus } from '@/types'

/**
 * 작품 문서의 첫머리 — 제목과 동작, 표지, 이 작품에 대해 아는 것 전부.
 *
 * 판(app-card)도 테두리도 두르지 않는다. 이 페이지는 카드 몇 장이 아니라 문서 한 장으로
 * 읽혀야 하고, 그러면 경계는 선이 아니라 여백이 진다.
 *
 * 라벨과 값을 두 칸으로 세우는 속성 목록도 해봤는데, 여덟 줄이 한 벌로 늘어서니 작품
 * 소개가 아니라 서식(form)처럼 읽혔다. 그래서 라벨을 다 걷고 글자 크기와 여백으로만
 * 층을 낸다 — 이름표 없이도 '구병모 · 2018' 이 저자와 연도인 건 이미 안다.
 *
 * 가로선 하나가 가르는 건 두 종류의 정보다. 위는 작품 자체(종류·저자·연도·줄거리),
 * 아래는 우리가 얹은 것(평점·추천). 앞의 것은 어디서 봐도 같고, 뒤의 것은 이 스터디에만 있다.
 */
export default function WorkOverview({
  work,
  members,
  currentUserId,
  rank,
  rankYear,
  step,
  advancing,
  onAdvance,
  onAddSession,
  onManage,
  onSaveReason,
}: {
  work: RankedWork
  members: User[]
  currentUserId: string
  rank: Rank | null
  /** 순위를 매긴 해. 올해면 굳이 안 밝힌다 */
  rankYear: number | null
  /** 앞으로 한 칸 나아가는 동작. 완료는 끝이라 없다 */
  step?: { to: WorkStatus; label: string }
  advancing: boolean
  onAdvance: () => void
  onAddSession: () => void
  onManage: () => void
  onSaveReason: (reason: string) => void
}) {
  const showRankYear = rankYear !== null && rankYear !== new Date().getFullYear()

  return (
    <header className="flex flex-col gap-7 py-10 first:pt-0">
      {/*
        제목과 동작이 한 줄에 선다. 예전에는 동작 버튼이 카드 맨 위 제 줄을 통째로 차지했는데,
        문서에서 맨 윗줄은 제목의 자리다 — 동작은 그 줄 오른쪽 끝으로 물러난다.
      */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="min-w-0 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
          {work.title}
        </h1>

        <div className="flex flex-none items-center gap-2">
          {work.status === WorkStatus.READING && (
            <button
              type="button"
              onClick={onAddSession}
              className="app-button app-button-secondary"
            >
              <CalendarPlus aria-hidden className="size-4" strokeWidth={1.75} />
              <span className="max-sm:hidden">일정 추가</span>
            </button>
          )}
          {step && (
            <button
              type="button"
              onClick={onAdvance}
              disabled={advancing}
              className="app-button app-button-primary"
            >
              {step.label}
            </button>
          )}
          <button
            type="button"
            onClick={onManage}
            className="app-button app-button-secondary app-icon-button"
            aria-label="정보 수정 · 상태 바꾸기 · 삭제"
          >
            <MoreHorizontal aria-hidden className="size-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-8 sm:flex-row sm:gap-10">
        <div className="w-40 flex-none sm:w-48">
          <Cover work={work} size="lg" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {/* 한눈에 걸리는 표시들만 먼저 — 종류, 지금 어디까지 왔는지, 그리고 받은 상 */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-medium text-neutral-500">{kindLabel[work.kind]}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                work.status === WorkStatus.READING
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              {statusLabel[work.status]}
            </span>
            {rank && (
              <span className="flex items-center gap-1.5">
                {/*
                  스티커는 absolute 로 그려지므로(자리 잡을 부모가 있어야 한다) 제 크기만큼의
                  칸을 만들어 그 안에 앉힌다. 카드 모서리에 비스듬히 붙던 걸 여기서는 똑바로.
                */}
                <span className="relative inline-flex size-7">
                  <RankSticker rank={rank} size="sm" className="top-0 left-0" />
                </span>
                <span className="text-xs font-medium text-neutral-600 tabular-nums">
                  {showRankYear && `${rankYear}년 `}
                  {rank}위
                </span>
              </span>
            )}
          </div>

          <div>
            <p className="text-base text-neutral-600">
              {work.author} · <span className="tabular-nums">{work.year}</span>
            </p>
            {work.actors && work.actors.length > 0 && (
              <p className="mt-1 text-sm text-neutral-500">출연 {work.actors.join(' · ')}</p>
            )}
          </div>

          {/* 폭을 prose 로 묶는 이유: 화면이 넓다고 한 줄이 끝까지 가면 다음 줄 첫 글자를 눈이 못 찾는다 */}
          {work.description && (
            <p className="max-w-prose text-[0.9375rem] leading-7 text-neutral-600">
              {work.description}
            </p>
          )}

          {/* 여기서부터는 이 스터디가 얹은 것 — 어디서 봐도 같은 위쪽과 선 하나로 가른다 */}
          <div className="mt-1 flex flex-col gap-4 border-t border-neutral-100 pt-5">
            {work.voterCount > 0 ? (
              <div className="flex items-center gap-3">
                <span className="font-serif text-4xl leading-none font-semibold tabular-nums">
                  {formatRating(work.average)}
                </span>
                <div className="flex flex-col gap-1">
                  <Stars value={work.average} />
                  <span className="text-sm text-neutral-500">{work.voterCount}명 평가</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Stars value={0} />
                평가 없음
              </div>
            )}

            <PickBlock
              addedBy={work.addedBy}
              reason={work.reason}
              users={members}
              canEdit={work.addedBy === currentUserId}
              onSave={onSaveReason}
            />
          </div>
        </div>
      </div>
    </header>
  )
}
