import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import UserSwitcher from '@/components/UserSwitcher'
import { useCurrentUser } from '@/hooks/currentUser'
import { getMyStudies } from '@/mocks/api'
import type { Study } from '@/types'

export default function RootLayout() {
  const { user } = useCurrentUser()
  const { studySlug } = useParams()
  const navigate = useNavigate()

  const { data: studies = [] } = useQuery({
    queryKey: ['myStudies', user?.id],
    queryFn: () => getMyStudies(user!.id),
    enabled: !!user,
  })

  const current = studies.find((s) => s.slug === studySlug) ?? null

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-5 px-6 py-3.5">
          <Link to="/" className="text-lg font-semibold tracking-[-0.03em]">
            mirelab
          </Link>

          {/* 스터디가 하나뿐이면 전환기 대신 이름만. 스터디 밖(내 서재)에서도 돌아갈 길이 필요하다 */}
          {studies.length > 1 ? (
            <select
              value={current?.slug ?? ''}
              onChange={(e) => navigate(`/${e.target.value}`)}
              className="cursor-pointer rounded-sm border border-neutral-200 px-2 py-1 text-sm"
              aria-label="스터디 고르기"
            >
              {!current && <option value="">스터디 고르기</option>}
              {studies.map((s) => (
                <option key={s.id} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : (
            studies[0] && (
              <Link
                to={`/${studies[0].slug}`}
                className={`border-l border-neutral-200 pl-5 text-sm ${
                  current ? 'text-neutral-500' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {studies[0].name}
              </Link>
            )
          )}

          <div className="ml-auto flex items-center gap-4">
            <NavLink
              to="/shelf"
              className={({ isActive }) =>
                isActive
                  ? 'text-sm font-medium text-neutral-900'
                  : 'text-sm text-neutral-500 hover:text-neutral-900'
              }
            >
              내 서재
            </NavLink>
            <UserSwitcher />
          </div>
        </div>

        {current && <StudyNav study={current} />}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12 sm:py-16">
        <Outlet />
      </main>

      <footer className="border-t border-neutral-200 px-6 py-5">
        <p className="mx-auto max-w-6xl text-xs text-neutral-400">
          목 데이터로 동작합니다. 새로고침하면 초기 상태로 돌아갑니다.
        </p>
      </footer>
    </div>
  )
}

function StudyNav({ study }: { study: Study }) {
  const base = `/${study.slug}`

  // 명예의 전당을 스터디의 얼굴로 두고, 자주 쓰는 기록 축만 전면에 둔다.
  const items = study.hasWorks
    ? [
        { to: base, label: '명예의 전당', end: true },
        { to: `${base}/library`, label: '작품', end: false },
        { to: `${base}/sessions`, label: '모임', end: true },
      ]
    : [
        { to: base, label: '홈', end: true },
        { to: `${base}/sessions`, label: '모임', end: true },
      ]

  return (
    <div className="border-t border-neutral-100">
      <nav className="mx-auto flex max-w-6xl gap-6 overflow-x-auto px-6 text-sm">
        {items.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative py-3 whitespace-nowrap ${
                isActive
                  ? 'font-medium text-emerald-800 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-emerald-700'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
