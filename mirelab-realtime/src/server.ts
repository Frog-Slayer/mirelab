import http from 'http'
import type { WebSocket } from 'ws'
import { WebSocketServer } from 'ws'
import { docs, setPersistence, setupWSConnection } from 'y-websocket/bin/utils'
import { assertInternalSecretConfigured, consumeTicket, extractTicket, reauthorize } from './auth'
import { saveSnapshot, springSnapshotPersistence } from './persistence'

assertInternalSecretConfigured()
setPersistence(springSnapshotPersistence)

const PORT = Number(process.env.PORT ?? 1234)
const PERSIST_INTERVAL_MS = Number(process.env.PERSIST_INTERVAL_MS ?? 5000)
/** 살아 있는 접속의 권한을 다시 물어보는 주기 — 권한을 뺏긴 사람이 편집할 수 있는 최대 시간 */
const REAUTH_INTERVAL_MS = Number(process.env.REAUTH_INTERVAL_MS ?? 60_000)
/** 백엔드가 답을 못 주는 동안 봐주는 시간. 이만큼 확인이 안 되면 접속을 끊는다 */
const REAUTH_GRACE_MS = Number(process.env.REAUTH_GRACE_MS ?? 300_000)

/** 인가 실패 — 4000번대는 애플리케이션이 쓰는 close code 대역이다 */
const CLOSE_UNAUTHORIZED = 4401

/**
 * 살아 있는 접속 하나. 티켓은 handshake 에서 이미 소비돼 사라졌으므로, 그 뒤로 이 소켓이
 * 누구 것인지 아는 건 여기 적어둔 [userId] 뿐이다.
 */
interface Session {
  conn: WebSocket
  docName: string
  userId: string
  /** 백엔드가 마지막으로 "아직 된다" 고 답해준 시각 */
  confirmedAt: number
}

const sessions = new Set<Session>()

function closeSession(session: Session, reason: string): void {
  console.warn(`[auth] ${session.docName} 접속 종료 — ${reason}`)
  sessions.delete(session)
  session.conn.close(CLOSE_UNAUTHORIZED, 'unauthorized')
}

/**
 * 접속 순간의 판정은 그 순간까지만 참이다. 관리자가 스터디에서 빼거나 계정을 거부해도
 * 이미 열린 소켓은 아무도 다시 확인하지 않아, 토큰 수명이 지나도 편집이 계속 통한다 —
 * 그래서 주기적으로 백엔드에 다시 물어보고 아니라면 그 자리에서 끊는다.
 *
 * 프론트는 4401 로 끊기면 새 티켓을 받아 재접속을 시도한다. 진짜로 권한을 잃었다면 그
 * 발급이 403 이라 재시도가 멈추고, 백엔드 장애였다면 회복된 뒤 저절로 다시 붙는다.
 */
async function reauthorizeSessions(): Promise<void> {
  const startedAt = Date.now()

  await Promise.all(
    [...sessions].map(async (session) => {
      const verdict = await reauthorize(session.docName, session.userId)

      if (verdict === 'allowed') {
        session.confirmedAt = Date.now()
        return
      }
      if (verdict === 'denied') {
        closeSession(session, '권한이 사라졌습니다')
        return
      }
      // 답을 못 받은 것뿐이니 한 번으로 끊지는 않는다. 다만 계속 확인이 안 되는 접속을
      // 무기한 열어두면 재인가를 붙인 의미가 없어서, 유예가 끝나면 끊는다.
      if (startedAt - session.confirmedAt >= REAUTH_GRACE_MS) {
        closeSession(session, `${Math.round(REAUTH_GRACE_MS / 1000)}초 넘게 권한을 확인하지 못했습니다`)
      }
    }),
  )
}

// URL 경로가 곧 방 이름(=블록 id) — 쿼리에는 일반 access token 이 아닌 일회용 티켓만 온다.
const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('mirelab-realtime ok')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (conn, req) => {
  const docName = (req.url ?? '').replace(/^\/yjs\//, '').split('?')[0]

  // 인가를 물어보는 동안(백엔드 왕복 한 번) 도착한 메시지는 아직 처리하면 안 된다.
  // setupWSConnection 이 붙기 전이라 리스너가 없어서 그냥 버려지는데, Yjs 는 CRDT 라
  // 접속 후 sync 로 상태를 다시 맞추므로 이 구간의 유실은 저절로 복구된다.
  void consumeTicket(docName, extractTicket(req)).then((userId) => {
    if (!userId) {
      console.warn(`[auth] ${docName} 접속 거절`)
      conn.close(CLOSE_UNAUTHORIZED, 'unauthorized')
      return
    }

    // 확인하는 사이 이미 끊고 간 접속에 setupWSConnection 을 걸면 안 된다
    if (conn.readyState !== conn.OPEN) return

    const session: Session = { conn, docName, userId, confirmedAt: Date.now() }
    sessions.add(session)
    conn.on('close', () => sessions.delete(session))

    setupWSConnection(conn, req, { docName })
  })
})

// writeState는 마지막 접속자가 나갈 때만 불린다 — 그 사이 릴레이가 죽으면
// 메모리에만 있던 편집분이 통째로 날아간다. 열려 있는 방을 주기적으로도 저장해
// 유실 구간을 이 주기만큼으로 줄인다.
setInterval(() => {
  for (const [docName, doc] of docs) {
    saveSnapshot(docName, doc)
  }
}, PERSIST_INTERVAL_MS)

// 한 라운드가 주기보다 오래 걸릴 때 라운드가 겹쳐 쌓이지 않게 한다
let reauthInFlight = false
setInterval(() => {
  if (reauthInFlight) return
  reauthInFlight = true
  void reauthorizeSessions().finally(() => {
    reauthInFlight = false
  })
}, REAUTH_INTERVAL_MS)

server.listen(PORT, () => {
  console.log(`mirelab-realtime listening on :${PORT}`)
})
