const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown) {
    super(`API ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/**
 * 서버가 보낸 사람이 읽을 오류 문구를 꺼낸다. 백엔드는 401·403·400 을 모두
 * `{"message": "..."}` 로 내려주므로(SecurityConfig·ResponseStatusException) 그걸 그대로
 * 보여주는 편이, 화면마다 지어낸 일반 문구보다 사용자에게 도움이 된다.
 */
/**
 * 서버가 준 `/api/...` 경로를 실제로 요청할 주소로 바꾼다 — `<img src>` 처럼 아래 fetch
 * 래퍼를 거칠 수 없는 곳이 쓴다.
 *
 * 래퍼는 경로 앞에 BASE_URL 을 붙이는데 이 경로에는 이미 `/api` 가 들어 있다. 그대로 쓰면
 * VITE_API_BASE_URL 로 백엔드를 다른 곳에 둔 배포에서 프론트 origin 의 `/api/...` 를
 * 찾으러 가고, 그건 SPA 폴백에 걸려 전부 404 가 된다.
 */
export function apiAssetUrl(path: string): string {
  return path.startsWith('/api/') ? `${BASE_URL}${path.slice('/api'.length)}` : path
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.body && typeof error.body === 'object') {
    const message = Reflect.get(error.body, 'message')
    if (typeof message === 'string' && message) return message
  }
  return fallback
}

/**
 * access token 은 메모리에만 둔다 — localStorage 에 두면 XSS 로 새고, 쿠키에 두면
 * SPA 라 읽을 일이 없는데 CSRF 표면만 늘어난다. 탭을 새로 열면 refresh 쿠키로
 * 다시 받아오면 된다(CurrentUserProvider 의 자동 로그인).
 */
let accessToken: string | null = null

/** 토큰이 갈릴 때 같이 따라가야 하는 것들(Yjs 접속 파라미터 등)에 알린다 */
const tokenListeners = new Set<(token: string | null) => void>()

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
  tokenListeners.forEach((listener) => listener(token))
}

export function onAccessTokenChange(listener: (token: string | null) => void): () => void {
  tokenListeners.add(listener)
  return () => tokenListeners.delete(listener)
}

/**
 * 세션이 완전히 끊겼을 때(갱신까지 실패) 부를 콜백 — CurrentUserProvider 가 등록해서
 * 화면을 로그아웃 상태로 되돌린다. api 모듈이 라우터·React 를 모르게 두려고 콜백으로 뺐다.
 */
let onAuthLost: (() => void) | null = null

export function setAuthLostHandler(handler: (() => void) | null): void {
  onAuthLost = handler
}

/**
 * 만료된 토큰을 갱신하는 방법. 실제 구현은 authApi 가 등록한다 — 이 모듈이
 * 인증 프로토콜(어느 경로를 어떻게 부르는지)을 몰라야 나중에 갈아끼우기 쉽고,
 * 무엇보다 갱신 경로가 여기저기 생기면 refresh 토큰이 여러 번 회전해서
 * 멀쩡한 세션이 스스로 깨진다. 갱신은 단 한 군데(authApi.refreshSession)만 한다.
 */
let tokenRefresher: (() => Promise<boolean>) | null = null

export function setTokenRefresher(refresher: (() => Promise<boolean>) | null): void {
  tokenRefresher = refresher
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  /** 갱신 요청 자신에게만 쓴다 — 안 그러면 401 → 갱신 → 401 로 서로를 부른다 */
  skipAuthRetry?: boolean
}

async function rawRequest<T>(
  path: string,
  { body, headers, skipAuthRetry: _skipAuthRetry, ...init }: RequestOptions = {},
): Promise<T> {
  // FormData 는 그대로 넘긴다. Content-Type 을 우리가 붙이면 브라우저가 만들어 넣는
  // multipart boundary 가 빠져서 서버가 본문을 못 읽는다.
  const multipart = body instanceof FormData

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    // refresh 쿠키가 실려야 갱신·로그아웃이 동작한다
    credentials: 'include',
    headers: {
      ...(body === undefined || multipart ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: multipart ? body : body === undefined ? undefined : JSON.stringify(body),
  })

  const text = await res.text()
  const parsed = text ? (JSON.parse(text) as unknown) : null

  if (!res.ok) throw new ApiError(res.status, parsed)
  return parsed as T
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, options)
  } catch (err) {
    const unauthorized = err instanceof ApiError && err.status === 401
    if (!unauthorized || options.skipAuthRetry || !tokenRefresher) throw err

    if (!(await tokenRefresher())) {
      onAuthLost?.()
      throw err
    }

    return await rawRequest<T>(path, options)
  }
}

/** 갱신 요청 자신은 재시도 루프를 타면 안 되므로 이 저수준 경로를 쓴다 */
export function requestWithoutAuthRetry<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return rawRequest<T>(path, options)
}

export const api = {
  get: <T>(path: string, init?: RequestOptions) => request<T>(path, { ...init, method: 'GET' }),
  post: <T>(path: string, body?: unknown, init?: RequestOptions) =>
    request<T>(path, { ...init, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, init?: RequestOptions) =>
    request<T>(path, { ...init, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, init?: RequestOptions) =>
    request<T>(path, { ...init, method: 'PATCH', body }),
  delete: <T>(path: string, init?: RequestOptions) =>
    request<T>(path, { ...init, method: 'DELETE' }),
}
