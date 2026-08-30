import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import Cover from '@/components/Cover'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import { formatDday, formatMeetAt } from '@/lib/format'
import { getCurrentSession } from '@/lib/scheduleApi'
import { ONE_DAY_MS, isSnoozed, snooze } from '@/lib/snoozeStore'
import type { Session, Study, Work } from '@/types'

/**
 * 지금 읽는 책의 전면 광고. 스터디에 들어오면 화면을 통째로 덮고, 닫아야 넘어간다.
 *
 * 예전에는 오른쪽 아래 구석의 작은 카드였다([FloatingStack] 에 얹혀 있었다). 구석은
 * 안 겹치고 안 방해해서 좋은 자리지만, 안 방해하는 만큼 안 읽힌다 — 모임이 사흘 앞인데
 * 아무도 그 카드를 본 적이 없었다. 그래서 반대로 갔다: 한 번은 반드시 보게 하고, 대신
 * 그 한 번으로 끝낸다.
 *
 * 닫는 길은 둘이다. 그냥 닫으면 이 화면에서만 치우고 — 새로고침하면 다시 뜬다 — "하루 동안
 * 보지 않기" 를 누르면 [snoozeStore] 에 기한을 적어 하루를 건너뛴다. 기한을 두는 쪽을 고른
 * 이유는 모임이 며칠 뒤이기 때문이다. 한 번 닫았다고 영영 안 보여주면 정작 전날 저녁에
 * 들어온 사람에게 아무 말도 안 하게 된다.
 *
 * 책이 없는 모임에는 안 뜬다. 광고할 것이 표지와 제목인데 그게 없으면 남는 게 날짜
 * 한 줄뿐이고, 그 한 줄을 위해 화면을 덮을 이유는 없다 — 일정 탭이 이미 그 일을 한다.
 */
export default function ThisSessionAd({ study }: { study: Study | null }) {
  /**
   * 이번 화면에서 닫은 모임. 그냥 닫기가 기대는 곳이자, [snoozeStore] 에 못 적는
   * 브라우저에서 "하루 동안 보지 않기" 가 최소한 이 화면에서는 듣게 하는 자리다.
   */
  const [closedId, setClosedId] = useState<string | null>(null)

  const { data: current } = useQuery({
    queryKey: ['currentSession', study?.slug],
    queryFn: () => getCurrentSession(study!.slug),
    enabled: !!study,
  })

  // 화면을 옮길 때마다 localStorage 를 다시 읽지 않는다 — 모임이 바뀔 때만 물어보면 된다.
  const sessionId = current?.session.id ?? null
  const snoozed = useMemo(() => (sessionId ? isSnoozed(adKey(sessionId)) : false), [sessionId])

  if (!study || !current?.work) return null

  const { session, work } = current
  if (snoozed || closedId === session.id) return null

  return (
    <Ad
      session={session}
      work={work}
      studySlug={study.slug}
      // 어떻게 닫든 이 화면에서는 접는다. 하루를 건너뛸지는 아래에서 따로 정한다.
      onDismiss={() => setClosedId(session.id)}
      onSnooze={() => snooze(adKey(session.id), ONE_DAY_MS)}
    />
  )
}

function adKey(sessionId: string) {
  return `session-ad:${sessionId}`
}

/**
 * 실제로 덮는 판. 바깥에서 조건이 맞을 때만 새로 마운트해야 아래 showModal 이 돈다 —
 * 이 프로젝트의 다른 창들([RateDialog] 등)과 같은 방식이다.
 *
 * 그냥 닫는 길은 셋이다(X · 배경 누르기 · Esc). 네이티브 <dialog> 라 셋이 close 이벤트
 * 하나로 모이므로 [onDismiss] 는 거기 한 번만 건다. 하루를 건너뛰는 것은 그 셋과 다른
 * 뜻이라 버튼에서 [onSnooze] 를 먼저 부른 뒤 닫는다 — close 이벤트만 보고는 어느 길로
 * 닫혔는지 가릴 수 없다.
 */
function Ad({
  session,
  work,
  studySlug,
  onDismiss,
  onSnooze,
}: {
  session: Session
  work: Work
  studySlug: string
  onDismiss: () => void
  onSnooze: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    ref.current?.showModal()
  }, [])
  useLockBodyScroll()

  return (
    <dialog
      ref={ref}
      onClose={onDismiss}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close()
      }}
      /* overflow-hidden: 윗판의 바탕색이 둥근 모서리 밖으로 삐져나오지 않게 */
      className="m-auto w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-3xl p-0 shadow-2xl ring-1 ring-neutral-950/10 backdrop:bg-neutral-950/70 backdrop:backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={() => ref.current?.close()}
        aria-label="닫기"
        /* 표지 위에 얹히므로 반투명 바탕을 깔아 준다 — 어두운 표지에서도 X 가 보이게 */
        className="absolute top-3 right-3 z-10 grid size-8 cursor-pointer place-items-center rounded-full bg-white/70 text-neutral-500 backdrop-blur-sm transition-colors hover:bg-white hover:text-neutral-900"
      >
        <X aria-hidden className="size-4" strokeWidth={2} />
      </button>

      {/*
        표지가 주인공인 윗판. 배경을 아래로 갈수록 흰색이 되게 두면 표지가 종이 위에
        놓인 것처럼 읽히고, 아래 글자판과의 경계에 선을 하나 더 그을 필요가 없다.
      */}
      <div className="flex flex-col items-center gap-4 bg-gradient-to-b from-[#e4eae8] to-white px-6 pt-10 pb-5">
        <div className="w-40 drop-shadow-xl">
          <Cover work={work} size="lg" />
        </div>
        <span className="rounded-full bg-[#245445] px-3 py-1 text-xs font-medium text-white">
          다음 모임 · {formatDday(session.meetAt) ?? '날짜 미정'}
        </span>
      </div>

      <div className="flex flex-col px-6 pb-6 text-center">
        <h2 className="font-serif text-2xl font-semibold tracking-[-0.02em] text-balance">
          {work.title}
        </h2>
        <p className="mt-1.5 text-sm text-neutral-500">{work.author}</p>
        <p className="mt-3 text-sm text-neutral-500">{formatMeetAt(session.meetAt)}</p>

        <button
          type="button"
          onClick={() => {
            ref.current?.close()
            navigate(`/${studySlug}/books/${work.id}`)
          }}
          className="app-button app-button-primary mt-6 w-full"
        >
          기록하러 가기
          <ArrowRight aria-hidden className="size-4" strokeWidth={2} />
        </button>
        {/*
          그냥 닫는 버튼은 두지 않는다 — 오른쪽 위 X 와 하는 일이 똑같아서, 나란히 두면
          둘이 서로 다른 일을 하는 줄 알고 읽게 된다. 여기 남는 건 X 로는 못 하는 것뿐이다.
        */}
        <button
          type="button"
          onClick={() => {
            onSnooze()
            ref.current?.close()
          }}
          className="mt-3 cursor-pointer py-1.5 text-xs text-neutral-500 hover:text-neutral-900"
        >
          하루 동안 보지 않기
        </button>
      </div>
    </dialog>
  )
}
