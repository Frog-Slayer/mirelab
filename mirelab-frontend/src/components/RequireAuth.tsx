import { Navigate, Outlet } from 'react-router'
import { useCurrentUser } from '@/hooks/currentUser'

function Splash({ label }: { label: string }) {
  return <p className="px-6 py-16 text-center text-sm text-neutral-400">{label}</p>
}

/**
 * 로그인 안 된 사람은 /login 으로. status 가 loading 인 동안은 아무 판단도 하지 않는다 —
 * 자동 로그인이 끝나기 전에 리다이렉트하면 새로고침마다 로그인 화면이 번쩍인다.
 */
export default function RequireAuth() {
  const { status } = useCurrentUser()

  if (status === 'loading') return <Splash label="불러오는 중…" />
  if (status === 'anonymous') return <Navigate to="/login" replace />

  return <Outlet />
}

/**
 * admin 전용 화면. 실제 차단은 서버(`/api/admin` 하위 → ROLE_ADMIN)가 하고,
 * 여기는 메뉴를 잘못 눌렀을 때 빈 화면 대신 되돌려 보내는 역할이다.
 */
export function RequireAdmin() {
  const { status, isAdmin } = useCurrentUser()

  if (status === 'loading') return <Splash label="불러오는 중…" />
  if (!isAdmin) return <Navigate to="/" replace />

  return <Outlet />
}
