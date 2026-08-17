import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import Cover from '@/components/Cover'
import { getCurrentSession } from '@/lib/scheduleApi'
import { useStudy } from '@/hooks/useStudy'
import { formatDday, formatMeetAt } from '@/lib/format'

/**
 * 지금 진행 중인 모임으로 들어가는 입구. 닫으면 작은 알약 버튼으로 접힌다 —
 * 다시 펴는 법을 안 남기면 아예 못 찾는다. 다른 모임이 다음 차례가 되면 자동으로 다시 펼쳐진다.
 */
export default function ThisSessionBanner() {
  const { study } = useStudy()
  const [closedId, setClosedId] = useState<string | null>(null)

  const { data: current } = useQuery({
    queryKey: ['currentSession', study?.slug],
    queryFn: () => getCurrentSession(study!.slug),
    enabled: !!study,
  })

  if (!study || !current) return null

  const { session, work } = current
  const closed = closedId === session.id

  if (closed) {
    return (
      <button
        type="button"
        onClick={() => setClosedId(null)}
        aria-label="다음 모임 다시 보기"
        title={`다음 모임 · ${formatDday(session.meetAt) ?? '날짜 미정'}`}
        className="fixed right-4 bottom-4 z-40 rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-emerald-700 shadow-lg hover:border-emerald-300"
      >
        {formatDday(session.meetAt) ?? '모임'}
      </button>
    )
  }

  return (
    <div className="fixed right-4 bottom-4 z-40 w-[min(22rem,calc(100vw-2rem))]">
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
