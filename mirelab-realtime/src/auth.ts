import type { IncomingMessage } from 'http'

const SPRING_BASE_URL = process.env.SPRING_BASE_URL ?? 'http://localhost:8080'
const INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? ''

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
 * 이 접속을 받아들일지 백엔드에 물어본다.
 *
 * 토큰을 여기서 직접 검증하지 않는 이유: 서명이 맞다는 것만으로는 "그 사람이 *이 방*에
 * 들어와도 되나" 를 알 수 없다. 방 이름은 블록 id 이고 그 판정에는 작품·스터디 소속이
 * 필요해서, 접속 시 한 번 물어보고 판단 주체를 백엔드 하나로 둔다.
 *
 * 백엔드가 죽어 있으면 거절한다 — 열어두면 무인증 편집이 되는데, 그건 이 인가를 붙인
 * 이유 자체를 무의미하게 만든다.
 */
export async function authorizeConnection(docName: string, token: string | null): Promise<boolean> {
  if (!token) return false

  try {
    const res = await fetch(`${SPRING_BASE_URL}/internal/blocks/${docName}/authorize`, {
      method: 'POST',
      headers: internalHeaders({ Authorization: `Bearer ${token}` }),
    })
    return res.ok
  } catch (err) {
    console.error(`[auth] ${docName} 인가 확인 실패 — 접속을 거절합니다`, err)
    return false
  }
}

/** 프론트(CollaborativeBody)가 접속 URL 쿼리에 실어 보내는 access token */
export function extractToken(req: IncomingMessage): string | null {
  const query = (req.url ?? '').split('?')[1]
  if (!query) return null
  return new URLSearchParams(query).get('token')
}

export { SPRING_BASE_URL }
