import { Link, Navigate, useLocation } from 'react-router'
import { isRestoredNavigation } from '@/lib/lastPageStore'

export default function NotFoundPage() {
  const { state } = useLocation()

  // 로그인하며 마지막 자리로 끌려왔는데 그 자리가 없어진 경우 — 지워진 작품 같은 것.
  // 사람이 뭘 잘못 누른 게 아니므로 404 를 보여줄 일이 아니다([lastPageStore]).
  if (isRestoredNavigation(state)) return <Navigate to="/app" replace />

  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">404</h1>
      <p className="text-neutral-600">요청하신 페이지를 찾을 수 없습니다.</p>
      <Link to="/" className="text-sm underline underline-offset-4">
        홈으로 돌아가기
      </Link>
    </section>
  )
}
