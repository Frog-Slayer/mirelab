import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useCurrentUser } from '@/hooks/currentUser'

/**
 * 구글에서 돌아오는 착륙 지점. 여기서 갱신 API 를 직접 부르지 않는다 —
 * 앱이 새로 뜨는 길이라 [CurrentUserProvider] 의 자동 로그인이 이미 그걸 하고 있고,
 * 한 번 더 부르면 refresh 토큰이 두 번 회전해서 방금 만든 세션이 스스로 깨진다.
 * 그래서 결과만 기다렸다가 길을 갈라준다.
 */
export default function AuthCallbackPage() {
  const { status } = useCurrentUser()
  const navigate = useNavigate()

  useEffect(() => {
    if (status === 'authenticated') navigate('/', { replace: true })
    else if (status === 'anonymous') navigate('/login?error=oauth_failed', { replace: true })
  }, [status, navigate])

  return <p className="px-6 py-16 text-center text-sm text-neutral-400">로그인 중…</p>
}
