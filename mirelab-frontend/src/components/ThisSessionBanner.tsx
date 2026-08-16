import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import Cover from '@/components/Cover'
import { getCurrentSession } from '@/mocks/api'
import { useStudy } from '@/hooks/useStudy'
import { formatDday, formatMeetAt } from '@/lib/format'

/** 지금 진행 중인 모임으로 들어가는 입구. 배너 전체가 링크다 */
export default function ThisSessionBanner() {
  const { study } = useStudy()

  const { data: current } = useQuery({
    queryKey: ['currentSession', study?.id],
    queryFn: () => getCurrentSession(study!.id),
    enabled: !!study,
  })

  if (!study || !current) return null

  const { session, work } = current

  return (
    <div>
      <Link
        to={`/${study.slug}/w/${session.id}`}
        className="group flex items-center gap-5 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-colors hover:border-emerald-300"
      >
        {work && <Cover work={work} size="sm" />}

        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-xs font-medium text-emerald-700">
            다음 모임 · {formatDday(session.meetAt) ?? '날짜 미정'}
          </span>
          <span className="text-xs text-neutral-500">{formatMeetAt(session.meetAt)}</span>
          <span className="text-base font-semibold">
            {work ? (
              <>
                {work.title} <span className="font-normal text-neutral-500">{session.title}</span>
              </>
            ) : (
              session.title
            )}
          </span>
        </div>

        <span className="ml-auto text-lg text-neutral-400 transition-transform group-hover:translate-x-1 group-hover:text-emerald-700">
          →
        </span>
      </Link>
    </div>
  )
}
