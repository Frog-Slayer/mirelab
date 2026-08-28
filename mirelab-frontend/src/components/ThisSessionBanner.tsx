import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import Cover from '@/components/Cover'
import { getCurrentSession } from '@/lib/scheduleApi'
import { formatDday, formatMeetAt } from '@/lib/format'
import type { Study } from '@/types'

/**
 * 지금 진행 중인 모임으로 들어가는 입구. 닫으면 그 모임에 대해서는 다시 뜨지 않고,
 * 다른 모임이 다음 차례가 되면 새로 뜬다. 일정 탭에서 언제든 다시 볼 수 있으므로
 * 접어두는 알약은 두지 않는다 — 오른쪽 아래 자리를 계속 차지하기 때문.
 *
 * 화면에서의 위치는 여기서 정하지 않는다. 오른쪽 아래에 뜨는 것들끼리 겹치지 않게
 * [FloatingStack] 이 자리를 잡아준다.
 */
export default function ThisSessionBanner({ study }: { study: Study | null }) {
  const [closedId, setClosedId] = useState<string | null>(null)

  const { data: current } = useQuery({
    queryKey: ['currentSession', study?.slug],
    queryFn: () => getCurrentSession(study!.slug),
    enabled: !!study,
  })

  if (!study || !current) return null

  const { session, work } = current
  if (closedId === session.id) return null

  return (
    <div className="pointer-events-auto relative w-[min(22rem,calc(100vw-2rem))]">
      <button
        type="button"
        onClick={() => setClosedId(session.id)}
        aria-label="닫기"
        className="absolute top-2 right-2 z-10 grid size-6 cursor-pointer place-items-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
      >
        ✕
      </button>

      <Link
        to={work ? `/${study.slug}/books/${work.id}` : `/${study.slug}/sessions`}
        className="group relative flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-lg transition-colors hover:border-emerald-300"
      >
        {work && <Cover work={work} size="sm" />}

        <div className="flex min-w-0 flex-col gap-1 pr-6">
          <span className="text-xs font-medium text-emerald-700">
            다음 모임 · {formatDday(session.meetAt) ?? '날짜 미정'}
          </span>
          <span className="text-xs text-neutral-500">{formatMeetAt(session.meetAt)}</span>
          <span className="text-base font-semibold">{work?.title ?? '모임'}</span>
        </div>

        <span className="absolute right-3 bottom-2 text-lg text-neutral-400 transition-transform group-hover:translate-x-1 group-hover:text-emerald-700">
          →
        </span>
      </Link>
    </div>
  )
}
