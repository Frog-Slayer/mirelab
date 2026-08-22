import { API_BASE_URL, getAccessToken, refreshAuth } from '@/lib/api'

/**
 * 서버가 밀어주는 신호(SSE)를 받는 접속 하나.
 *
 * 브라우저 기본 `EventSource` 를 안 쓰는 이유는 헤더를 못 싣기 때문이다 — access token 은
 * 메모리에만 두고 Authorization 헤더로만 보내므로(`lib/api.ts`), 토큰을 쿼리스트링에
 * 실어 로그·리퍼러로 흘리지 않으려면 fetch 스트림으로 직접 읽어야 한다.
 *
 * 끊김은 예외 상황이 아니라 일상이다 — 노트북 덮개를 닫거나 프록시가 조용한 접속을
 * 정리하면 그냥 끊긴다. 그래서 끊기면 점점 뜸하게 다시 붙고, 붙어 있는지 여부는
 * onConnectedChange 로 알려준다(호출한 쪽이 그동안 폴링으로 버틸 수 있게).
 */
export function openLiveStream(
  path: string,
  {
    onEvent,
    onConnectedChange,
  }: {
    /** 이름 있는 이벤트가 도착했을 때. 주석(keep-alive)은 올라오지 않는다 */
    onEvent: (event: string) => void
    onConnectedChange?: (connected: boolean) => void
  },
): () => void {
  const controller = new AbortController()
  let closed = false
  let attempt = 0
  let retryTimer: number | null = null

  const scheduleRetry = () => {
    if (closed || retryTimer !== null) return
    const delay = Math.min(MAX_RETRY_MS, BASE_RETRY_MS * 2 ** attempt)
    attempt += 1
    retryTimer = window.setTimeout(() => {
      retryTimer = null
      void connect()
    }, delay)
  }

  const request = () =>
    fetch(`${API_BASE_URL}${path}`, {
      signal: controller.signal,
      credentials: 'include',
      headers: {
        Accept: 'text/event-stream',
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
    })

  const connect = async () => {
    if (closed) return
    try {
      let response = await request()
      if (response.status === 401 && (await refreshAuth())) response = await request()
      if (!response.ok || !response.body) return

      attempt = 0
      onConnectedChange?.(true)
      await read(response.body, onEvent)
    } catch {
      // 끊김 자체는 알릴 일이 아니다 — 아래에서 조용히 다시 붙는다.
    } finally {
      if (!closed) {
        onConnectedChange?.(false)
        scheduleRetry()
      }
    }
  }

  void connect()

  return () => {
    closed = true
    if (retryTimer !== null) window.clearTimeout(retryTimer)
    controller.abort()
  }
}

/** SSE 는 이벤트 하나가 빈 줄로 끝난다. 우리가 쓰는 건 이름뿐이라 data 는 흘려보낸다 */
async function read(body: ReadableStream<Uint8Array>, onEvent: (event: string) => void) {
  const reader = body.getReader()
  // 멀티바이트 문자가 청크 경계에 걸릴 수 있어 stream 모드로 이어 붙인다
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { value, done } = await reader.read()
    if (done) return
    buffer += decoder.decode(value, { stream: true })

    let boundary = buffer.indexOf('\n\n')
    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      const parsed = parseEvent(chunk)
      if (parsed) onEvent(parsed)
      boundary = buffer.indexOf('\n\n')
    }
  }
}

function parseEvent(chunk: string): string | null {
  let name: string | null = null
  let hasData = false

  for (const rawLine of chunk.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    // ':' 로 시작하면 주석 — keep-alive 가 이걸로 온다
    if (line.startsWith(':')) continue
    if (line.startsWith('event:')) name = line.slice('event:'.length).trim()
    else if (line.startsWith('data:')) hasData = true
  }

  return hasData ? (name ?? 'message') : null
}

const BASE_RETRY_MS = 1_000
const MAX_RETRY_MS = 30_000
