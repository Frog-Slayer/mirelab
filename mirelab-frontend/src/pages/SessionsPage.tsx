import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import Cover from '@/components/Cover'
import { useStudy } from '@/hooks/useStudy'
import { getSessions, type SessionSummary } from '@/mocks/api'
import { formatMeetAt } from '@/lib/format'
import { WorkStatus } from '@/types'

const statusLabel: Record<string, string> = {
  [WorkStatus.CANDIDATE]: '후보',
  [WorkStatus.READING]: '읽는 중',
  [WorkStatus.DONE]: '완료',
}

export default function SessionsPage() {
  const { study, members } = useStudy()

  const { data: sessions = [], isPending } = useQuery({
    queryKey: ['sessions', study?.id],
    queryFn: () => getSessions(study!.id),
    enabled: !!study,
  })

  if (!study) return null

  // 진행 중은 하나뿐이다 — 안 끝난 것 중 날짜가 가장 가까운 것. 미정은 뒤로 민다
  const currentId = sessions
    .filter((s) => !s.session.closed)
    .sort((a, b) => (a.session.meetAt ?? '9999').localeCompare(b.session.meetAt ?? '9999'))[0]
    ?.session.id

  // 책 아래로 모임을 접어 넣는다. 평평한 목록이면 어떤 작품의 기록인지 알기 어렵다.
  const groups: Array<{ key: string; work: SessionSummary['work']; items: SessionSummary[] }> = []
  for (const summary of sessions) {
    const key = summary.work?.id ?? '(없음)'
    const found = groups.find((g) => g.key === key)
    if (found) found.items.push(summary)
    else groups.push({ key, work: summary.work, items: [summary] })
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-neutral-200 pb-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">모임</h1>
          <p className="text-sm text-neutral-500">
            작품과 읽은 범위별로 개인 준비와 함께 정리한 기록을 모아봅니다.
          </p>
        </div>
        <Link to={`/${study.slug}/sessions/new`} className="app-button app-button-primary">
          새 모임
        </Link>
      </div>

      {isPending && <p className="text-sm text-neutral-400">불러오는 중…</p>}

      <div className="flex flex-col gap-10">
        {groups.map(({ key, work, items }) => (
          <section key={key} className="flex flex-col gap-2">
            {/* 책 머리 */}
            <div className="flex items-center gap-4 border-b border-neutral-200 pb-3">
              {work ? <Cover work={work} size="sm" /> : null}
              <div className="flex min-w-0 flex-col">
                {work ? (
                  <Link
                    to={`/${study.slug}/books/${work.id}`}
                    className="truncate text-lg font-semibold hover:underline"
                  >
                    {work.title}
                  </Link>
                ) : (
                  <span className="font-medium text-neutral-500">책 없음</span>
                )}
                <span className="text-xs text-neutral-500">
                  {work && `${statusLabel[work.status]} · `}
                  모임 {items.length}번
                </span>
              </div>
            </div>

            {/* 그 작품의 모임들 — 최근이 위 */}
            <ul className="flex flex-col">
              {items.map(({ session, submitted }, i) => {
                const nth = items.length - i
                return (
                  <li key={session.id}>
                    <Link
                      to={`/${study.slug}/w/${session.id}`}
                      className="flex items-center gap-4 border-b border-neutral-100 px-2 py-4 hover:bg-neutral-100"
                    >
                      <span className="w-12 flex-none text-center text-xs text-neutral-400">
                        {nth}번째
                      </span>
                      <span className="min-w-0 flex-1 truncate font-mono text-sm text-neutral-700">
                        {formatMeetAt(session.meetAt)}
                      </span>
                      {!session.closed && (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs whitespace-nowrap ${
                            session.id === currentId
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                              : 'border-neutral-300 text-neutral-500'
                          }`}
                        >
                          {session.id === currentId ? '진행 중' : '예정'}
                        </span>
                      )}
                      <span className="w-8 text-right font-mono text-xs text-neutral-400 tabular-nums">
                        {submitted.length}/{members.length}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
