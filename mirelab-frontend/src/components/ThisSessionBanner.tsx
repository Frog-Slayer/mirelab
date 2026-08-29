import { useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import Cover from '@/components/Cover'
import { useSwipeDismiss } from '@/hooks/useSwipeDismiss'
import { getCurrentSession } from '@/lib/scheduleApi'
import { formatDday, formatMeetAt } from '@/lib/format'
import type { Study } from '@/types'

/**
 * 지금 진행 중인 모임으로 들어가는 입구. 닫으면 그 모임에 대해서는 다시 뜨지 않고,
 * 다른 모임이 다음 차례가 되면 새로 뜬다. 일정 탭에서 언제든 다시 볼 수 있으므로
 * 접어두는 알약은 두지 않는다 — 오른쪽 아래 자리를 계속 차지하기 때문.
 *
 * 손가락으로는 오른쪽으로 밀어서도 닫는다([useSwipeDismiss]) — 화면 구석의 작은 X 는
 * 엄지로 겨냥하기 나쁘다. 닫기 버튼을 없애는 게 아니라 길을 하나 더 두는 것이다.
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

  // 훅이라 이른 return 보다 위에 있어야 한다 — 세션이 없는 동안에도 순서가 같아야 하므로
  // 닫을 대상은 콜백 안에서 그때의 세션으로 읽는다.
  const swipe = useSwipeDismiss(() => setClosedId(current?.session.id ?? null))

  if (!study || !current) return null

  const { session, work } = current
  if (closedId === session.id) return null

  return (
    <div
      {...swipe.handlers}
      style={swipe.style}
      // 끌리는 동안에는 손가락을 그대로 따라와야 한다 — transition 이 걸려 있으면 늦게 따라온다
      className={`pointer-events-auto relative w-[min(22rem,calc(100vw-2rem))] ${
        swipe.dragging
          ? 'transition-none'
          : 'transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none'
      }`}
    >
      <button
        type="button"
        onClick={() => setClosedId(session.id)}
        aria-label="닫기"
        className="absolute top-2 right-2 z-10 grid size-6 cursor-pointer place-items-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
      >
        <X aria-hidden className="size-4" strokeWidth={2} />
      </button>

      <Link
        to={work ? `/${study.slug}/books/${work.id}` : `/${study.slug}/sessions`}
        className="app-tile group relative flex items-center gap-4 p-4 shadow-md hover:ring-emerald-400/60"
      >
        {work && <Cover work={work} size="sm" />}

        <div className="flex min-w-0 flex-col gap-1 pr-6">
          <span className="text-xs font-medium text-emerald-700">
            다음 모임 · {formatDday(session.meetAt) ?? '날짜 미정'}
          </span>
          <span className="text-xs text-neutral-500">{formatMeetAt(session.meetAt)}</span>
          <span className="text-base font-semibold">{work?.title ?? '모임'}</span>
        </div>

        <ArrowRight
          aria-hidden
          className="absolute right-3 bottom-2.5 size-4 text-neutral-400 transition-transform group-hover:translate-x-1 group-hover:text-emerald-700"
          strokeWidth={2}
        />
      </Link>
    </div>
  )
}
