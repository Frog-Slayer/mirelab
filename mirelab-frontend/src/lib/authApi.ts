import { requestWithoutAuthRetry, setAccessToken, setTokenRefresher } from '@/lib/api'
import type { User } from '@/types'

export interface AuthResult {
  accessToken: string
  expiresInSeconds: number
  user: User
}

export interface SignupProfile {
  email: string
  googleName: string
  pictureUrl: string | null
}

/**
 * 갱신은 동시에 여러 번 나가면 안 된다 — refresh 토큰이 회전하기 때문에 두 번째 요청은
 * 이미 무효가 된 값을 들고 가서 실패하고, 그 실패가 멀쩡한 세션을 끊어버린다.
 * 그래서 진행 중인 약속을 공유한다(single-flight).
 */
let inFlight: Promise<AuthResult> | null = null

/**
 * refresh 쿠키로 access token 을 받아온다. 세 갈래가 모두 이 하나로 모인다 —
 * 최초 로그인 직후(`/auth/callback`), 새로고침 자동 로그인, 그리고 요청이 401 을
 * 만났을 때의 재시도. 구글 성공 핸들러가 쿠키만 심고 토큰은 URL 로 넘기지 않기 때문에
 * "로그인" 과 "갱신" 이 같은 동작이 된다.
 *
 * 쿠키가 없거나 죽었으면 ApiError(401) 로 던진다 — 부르는 쪽이 "로그아웃 상태" 로 읽는다.
 */
export function refreshSession(): Promise<AuthResult> {
  inFlight ??= requestWithoutAuthRetry<AuthResult>('/auth/refresh', { method: 'POST' })
    .then((res) => {
      setAccessToken(res.accessToken)
      return res
    })
    .catch((err: unknown) => {
      setAccessToken(null)
      throw err
    })
    .finally(() => {
      inFlight = null
    })

  return inFlight
}

// 401 을 만난 요청도 위 single-flight 를 타게 한다
setTokenRefresher(() =>
  refreshSession().then(
    () => true,
    () => false,
  ),
)

export async function logout(): Promise<void> {
  try {
    await requestWithoutAuthRetry<void>('/auth/logout', { method: 'POST' })
  } finally {
    // 서버 정리가 실패해도 이 브라우저는 로그아웃된 것으로 취급한다
    setAccessToken(null)
  }
}

/** 구글 동의화면으로 넘긴다. SPA 라우팅이 아니라 페이지 전체 이동이어야 한다 */
export function startGoogleLogin(): void {
  const base = import.meta.env.VITE_API_BASE_URL ?? '/api'
  window.location.href = `${base}/oauth2/authorization/google`
}

export function getSignupProfile(): Promise<SignupProfile> {
  return requestWithoutAuthRetry('/auth/signup', { method: 'GET' })
}

export function completeSignup(input: { username: string; name: string; color: string }): Promise<void> {
  return requestWithoutAuthRetry('/auth/signup', { method: 'POST', body: input })
}
