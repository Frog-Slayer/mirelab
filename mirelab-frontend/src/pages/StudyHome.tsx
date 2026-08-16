import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import Cover from '@/components/Cover'
import { useCurrentUser } from '@/hooks/currentUser'
import { useStudy } from '@/hooks/useStudy'
import { getCurrentSession, getLibrary, getSessions } from '@/mocks/api'
import { formatDday, formatMeetAt } from '@/lib/format'
import { WorkStatus } from '@/types'

/**
 * 스터디의 첫 화면. 과거 기록보다 지금 해야 할 일을 먼저 보여준다.
 */
export default function StudyHome() {
  const { user } = useCurrentUser()
  const { study, isPending } = useStudy()

  const { data: current } = useQuery({
    queryKey: ['currentSession', study?.id],
    queryFn: () => getCurrentSession(study!.id),
    enabled: !!study,
  })
  const { data: works = [] } = useQuery({
    queryKey: ['library', study?.id],
    queryFn: () => getLibrary(study!.id),
    enabled: !!study?.hasWorks,
  })
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', study?.id],
    queryFn: () => getSessions(study!.id),
    enabled: !!study,
  })

  if (isPending) return <p className="text-sm text-neutral-400">불러오는 중…</p>
  if (!study) return <p className="text-sm text-neutral-500">스터디를 찾을 수 없습니다.</p>

  const mineDone = !!user && !!current?.submitted.includes(user.id)
  const reading = works.filter((work) => work.status === WorkStatus.READING)
  const candidates = works.filter((work) => work.status === WorkStatus.CANDIDATE)
  const completed = works.filter((work) => work.status === WorkStatus.DONE)

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-1">
        <span className="text-sm font-medium text-emerald-700">{study.name}</span>
        <h1 className="text-3xl font-semibold tracking-tight">지금 함께 읽는 것</h1>
        <p className="text-sm text-neutral-500">
          다음 모임 준비와 함께 쌓인 기록을 한곳에서 봅니다.
        </p>
      </header>

      {current ? (
        <section className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
            {current.work && <Cover work={current.work} size="lg" />}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="text-xs font-medium text-emerald-700">다음 모임</span>
              <h2 className="text-2xl font-semibold tracking-tight">
                {current.work?.title ?? current.session.title}
              </h2>
              {current.work && (
                <p className="text-base text-neutral-700">{current.session.title}</p>
              )}
              <p className="text-sm text-neutral-500">
                {formatMeetAt(current.session.meetAt)}
                {formatDday(current.session.meetAt) && ` · ${formatDday(current.session.meetAt)}`}
              </p>
              <p
                className={`mt-1 text-sm ${mineDone ? 'text-neutral-500' : 'font-medium text-amber-700'}`}
              >
                {mineDone ? '내 준비를 제출했습니다.' : '아직 내 준비를 제출하지 않았습니다.'}
                {' · '}
                {current.submitted.length}/{current.submitted.length + current.pending.length}명
                완료
              </p>
            </div>
            <Link
              to={`/${study.slug}/w/${current.session.id}`}
              className="self-start rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 sm:self-center"
            >
              {mineDone ? '모임 기록 열기' : '내 준비 작성하기'}
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-dashed border-neutral-300 p-6">
          <h2 className="font-medium">예정된 모임이 없습니다.</h2>
          <Link
            to={`/${study.slug}/sessions/new`}
            className="mt-3 inline-block text-sm text-emerald-700 hover:underline"
          >
            새 모임 만들기 →
          </Link>
        </section>
      )}

      <div className={`grid gap-4 ${study.hasWorks ? 'sm:grid-cols-2' : ''}`}>
        {study.hasWorks && (
          <Link
            to={`/${study.slug}/library`}
            className="rounded-lg border border-neutral-200 p-5 transition-colors hover:border-neutral-400"
          >
            <span className="text-sm font-semibold">작품</span>
            <p className="mt-2 text-sm text-neutral-500">
              읽는 중 {reading.length} · 후보 {candidates.length} · 완료 {completed.length}
            </p>
          </Link>
        )}
        <Link
          to={`/${study.slug}/sessions`}
          className="rounded-lg border border-neutral-200 p-5 transition-colors hover:border-neutral-400"
        >
          <span className="text-sm font-semibold">모임 기록</span>
          <p className="mt-2 text-sm text-neutral-500">
            지금까지 {sessions.length}번 함께했습니다.
          </p>
        </Link>
      </div>
    </div>
  )
}
