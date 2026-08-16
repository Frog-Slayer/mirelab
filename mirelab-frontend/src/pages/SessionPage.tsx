import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import Cover from '@/components/Cover'
import { useStudy } from '@/hooks/useStudy'
import { getSession } from '@/mocks/api'
import { formatDday, formatMeetAt } from '@/lib/format'

/**
 * 모임 화면은 일정과 제출 현황만 보여준다. 기록은 전부 작품 상세에서 쓴다 —
 * 값이 회차가 아니라 작품에 붙으므로, 여기서 따로 쓸 것이 없다.
 */
export default function SessionPage() {
  const { sessionId = '' } = useParams()
  const { study, members } = useStudy()

  const { data, isPending } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => getSession(sessionId),
  })

  if (isPending) return <p className="text-sm text-neutral-400">불러오는 중…</p>
  if (!data || !study) return <p className="text-sm text-neutral-500">모임을 찾을 수 없습니다.</p>

  const { session, work, submitted, pending } = data

  return (
    <div className="flex flex-col gap-8">
      <Link
        to={`/${study.slug}/sessions`}
        className="text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← 모임 기록
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-neutral-200 pb-7">
        <div className="flex gap-5">
          {work && <Cover work={work} />}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-neutral-500">{formatMeetAt(session.meetAt)}</span>
            <h1 className="text-3xl leading-tight font-semibold tracking-[-0.03em]">
              {work?.title ?? '모임'}
            </h1>
            {work && (
              <Link
                to={`/${study.slug}/books/${work.id}`}
                className="mt-1 text-sm text-emerald-700 hover:underline"
              >
                작품 상세로 가서 기록하기 →
              </Link>
            )}
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            session.closed ? 'bg-neutral-200 text-neutral-600' : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {session.closed ? '마감됨' : (formatDday(session.meetAt) ?? '날짜 미정')}
        </span>
      </header>

      <section className="flex max-w-xl flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">제출 현황</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {work
              ? '작품 상세에 쓴 개인 기록을 기준으로 봅니다.'
              : '이 모임에는 아직 붙은 작품이 없습니다.'}
          </p>
        </div>

        <ul className="flex flex-col gap-2">
          {members.map((m) => {
            const done = submitted.includes(m.id)
            return (
              <li key={m.id} className="flex items-center gap-2.5 text-sm">
                <span className={`size-2 flex-none rounded-full ${m.color}`} aria-hidden />
                <span className="flex-1 text-neutral-700">{m.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    done ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {done ? '작성함' : '미작성'}
                </span>
              </li>
            )
          })}
        </ul>

        {pending.length === 0 && members.length > 0 && (
          <p className="text-xs text-neutral-500">모두 작성했습니다.</p>
        )}
      </section>
    </div>
  )
}
