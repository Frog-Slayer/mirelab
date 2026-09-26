import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useCurrentUser } from '@/hooks/currentUser'
import { RESTORED_STATE, readLastPage } from '@/lib/lastPageStore'

/**
 * 구글에서 돌아오는 착륙 지점. 여기서 갱신 API 를 직접 부르지 않는다 —
 * 앱이 새로 뜨는 길이라 [CurrentUserProvider] 의 자동 로그인이 이미 그걸 하고 있고,
 * 한 번 더 부르면 refresh 토큰이 두 번 회전해서 방금 만든 세션이 스스로 깨진다.
 * 그래서 결과만 기다렸다가 길을 갈라준다.
 */
export default function AuthCallbackPage() {
  const { status, user } = useCurrentUser()
  const navigate = useNavigate()

  useEffect(() => {
    if (status === 'authenticated') {
      // 지난번에 보던 자리로. 기억이 없거나 다른 사람 것이면 홈이 갈 곳을 정한다.
      const back = user ? readLastPage(user.id) : null
      // 그 자리가 사라졌을 수 있어 표시를 달아 보낸다 — 실패하면 홈으로 흘러간다
      if (back) navigate(back, { replace: true, state: RESTORED_STATE })
      else navigate('/app', { replace: true })
    } else if (status === 'anonymous') {
      navigate('/login?error=oauth_failed', { replace: true })
    }
  }, [status, user, navigate])

  return <p className="px-6 py-16 text-center text-sm text-neutral-500">로그인 중…</p>
}
