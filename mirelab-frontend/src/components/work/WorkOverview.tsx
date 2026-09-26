import type { ReactNode } from 'react'
import { CalendarPlus, MoreHorizontal } from 'lucide-react'
import Cover from '@/components/Cover'
import RankSticker, { type Rank } from '@/components/RankSticker'
import PickBlock from '@/components/work/PickBlock'
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
 *
 * `aside` 는 넓은 화면(lg 이상)에서 오른쪽 반쪽에 서고, 좁아지면 아래로 내려온다. 지금
 * 거기 들어가는 건 멤버별 평점이다 — 작품을 보는 것과 점수를 훑는 것은 대개 같이 하는 일이라
 * 세로로 멀리 떨어뜨리면 눈이 오간다.
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
  aside,
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
  /** 오른쪽 반쪽에 세울 것. 없으면 왼쪽이 통째로 넓어진다 */
  aside?: ReactNode
}) {
  const showRankYear = rankYear !== null && rankYear !== new Date().getFullYear()

  return (
    <header className="flex flex-col gap-7 py-10 first:pt-0">
      {/*
        맨 윗줄에는 동작만 남는다. 제목은 표지 옆으로 내려갔다 — 표지와 제목이 붙어 있어야
        "이 책" 이 한 덩이로 잡히고, 순위 스티커도 제목 옆에 있어야 무엇이 받은 상인지 보인다.
      */}
      <div className="flex items-center justify-end gap-2">
        {work.status === WorkStatus.READING && (
          <button type="button" onClick={onAddSession} className="app-button app-button-secondary">
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

      <div className={`grid gap-10 ${aside ? 'lg:grid-cols-2' : ''}`}>
        <div className="flex flex-col gap-8 sm:flex-row sm:gap-10">
          {/* 반쪽으로 좁아지는 만큼 표지도 한 치수 줄인다 — 옆의 글이 설 자리가 없어진다 */}
          <div className={`w-40 flex-none ${aside ? 'sm:w-48 lg:w-40' : 'sm:w-48'}`}>
            <Cover work={work} size="lg" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-5">
            {/*
              제목과 순위가 한 줄에 선다 — 상은 이 책이 받은 것이니 책 이름 옆에 있어야 한다.
              제목이 길어도 순위는 안 밀리게(flex-none) 두고, 줄어드는 건 제목 쪽이다.
            */}
            <div className="flex items-start justify-between gap-3">
              <h1 className="min-w-0 text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
                {work.title}
              </h1>

              {rank && (
                <span className="flex flex-none items-center gap-1.5 pt-1">
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

            {/* 종류와 지금 어디까지 왔는지 */}
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

            {/*
              예전에는 여기 위로 가로선을 그어 "어디서 봐도 같은 것"과 "우리가 얹은 것" 을
              갈랐다. 선 아래 남는 게 이것 하나뿐이라 선이 가르는 일보다 끊는 일을 더 했다.
            */}
            <PickBlock
              addedBy={work.addedBy}
              reason={work.reason}
              users={members}
              canEdit={work.addedBy === currentUserId}
              onSave={onSaveReason}
            />
          </div>
        </div>

        {aside}
      </div>
    </header>
  )
}
