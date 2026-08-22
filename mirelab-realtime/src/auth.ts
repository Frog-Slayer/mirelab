import type { IncomingMessage } from 'http'

const SPRING_BASE_URL = process.env.SPRING_BASE_URL ?? 'http://localhost:8080'
const INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? ''
/** 재인가 한 건을 기다려주는 시간 */
const REAUTH_TIMEOUT_MS = 5000

/** 백엔드의 /internal 경로를 부를 때 늘 붙여야 하는 헤더 */
export function internalHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { 'X-Internal-Secret': INTERNAL_SECRET, ...extra }
}

export function assertInternalSecretConfigured(): void {
  if (INTERNAL_SECRET) return
  // 시크릿이 없으면 스냅샷 저장·인가 확인이 전부 403 이라, 편집분이 조용히 유실된다.
  // 그런 상태로 뜨는 게 최악이므로 여기서 멈춘다.
  throw new Error('INTERNAL_SECRET 환경변수가 필요합니다 (백엔드 mirelab.internal-secret 과 같은 값)')
}

/**
 * 이 접속의 일회용 티켓을 백엔드에서 소비하고, 티켓의 주인(userId)을 받아온다.
 *
 * 티켓 발급 때 이미 사용자와 블록 접근 권한을 확인했다. 여기서는 티켓이 이 방에 묶여 있고
 * 아직 살아 있는지를 확인하면서 원자적으로 삭제한다. 그래서 URL이 로그 등에 남아도 이미
 * 성립한 접속의 티켓은 재사용할 수 없다.
 *
 * userId 를 받아 두는 이유는 [reauthorize] — 접속이 사는 동안 같은 사람의 권한을 다시
 * 물어보려면 릴레이도 "이 소켓이 누구 것인지" 를 기억해야 한다.
 *
 * 백엔드가 죽어 있으면 거절한다 — 열어두면 무인증 편집이 되는데, 그건 이 인가를 붙인
 * 이유 자체를 무의미하게 만든다.
 */
export async function consumeTicket(docName: string, ticket: string | null): Promise<string | null> {
  if (!ticket) return null

  try {
    const res = await fetch(`${SPRING_BASE_URL}/internal/blocks/${docName}/realtime-ticket/consume`, {
      method: 'POST',
      headers: internalHeaders({ 'X-Realtime-Ticket': ticket }),
    })
    if (!res.ok) return null

    const body = (await res.json()) as { userId?: unknown }
    return typeof body.userId === 'string' ? body.userId : null
  } catch (err) {
    console.error(`[auth] ${docName} 인가 확인 실패 — 접속을 거절합니다`, err)
    return null
  }
}

/**
 * 'unknown' 은 "거부됐다" 가 아니라 "백엔드가 답을 못 줬다" 는 뜻이다 — 잠깐의 장애로
 * 편집 중인 사람들을 전부 끊어버리지 않으려고 구분한다(유예는 server.ts 가 관리한다).
 */
export type Reauthorization = 'allowed' | 'denied' | 'unknown'

/**
 * 이미 맺어진 접속을 다시 인가한다.
 *
 * 접속 순간의 판정만 믿으면, 그 뒤에 거부되거나 스터디에서 빠진 사람이 소켓이 살아 있는
 * 내내 계속 편집할 수 있다. WebSocket 은 트래픽이 있는 한 nginx 의 read timeout 도
 * access token 수명(30분)도 건드리지 않고 며칠이든 유지되므로, 여기서 주기적으로 묻는다.
 */
export async function reauthorize(docName: string, userId: string): Promise<Reauthorization> {
  const url = `${SPRING_BASE_URL}/internal/blocks/${docName}/access?userId=${encodeURIComponent(userId)}`

  try {
    // 답 없이 매달리는 백엔드에 걸리면 재인가가 영영 안 끝나 유예 판정까지 멈춘다 —
    // 그럴 바엔 '확인 못 함'으로 빨리 접고 다음 주기에 다시 묻는다.
    const res = await fetch(url, {
      headers: internalHeaders(),
      signal: AbortSignal.timeout(REAUTH_TIMEOUT_MS),
    })
    if (res.ok) return 'allowed'
    // 403 = 권한이 사라짐, 404 = 블록이 지워짐. 둘 다 이 접속을 유지할 이유가 없다.
    if (res.status === 403 || res.status === 404) return 'denied'
    return 'unknown'
  } catch (err) {
    console.error(`[auth] ${docName} 재인가 확인 실패`, err)
    return 'unknown'
  }
}

/** 프론트(CollaborativeBody)가 접속 URL 쿼리에 실어 보내는 초단기 일회용 티켓 */
export function extractTicket(req: IncomingMessage): string | null {
  const query = (req.url ?? '').split('?')[1]
  if (!query) return null
  return new URLSearchParams(query).get('ticket')
}

export { SPRING_BASE_URL }
