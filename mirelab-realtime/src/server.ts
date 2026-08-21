import http from 'http'
import { WebSocketServer } from 'ws'
import { docs, setPersistence, setupWSConnection } from 'y-websocket/bin/utils'
import { assertInternalSecretConfigured, authorizeConnection, extractToken } from './auth'
import { saveSnapshot, springSnapshotPersistence } from './persistence'

assertInternalSecretConfigured()
setPersistence(springSnapshotPersistence)

const PORT = Number(process.env.PORT ?? 1234)
const PERSIST_INTERVAL_MS = Number(process.env.PERSIST_INTERVAL_MS ?? 5000)

/** 인가 실패 — 4000번대는 애플리케이션이 쓰는 close code 대역이다 */
const CLOSE_UNAUTHORIZED = 4401

// URL 경로가 곧 방 이름(=블록 id) — /yjs/<blockId>?token=<access token> 로 접속한다.
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
  void authorizeConnection(docName, extractToken(req)).then((allowed) => {
    if (!allowed) {
      console.warn(`[auth] ${docName} 접속 거절`)
      conn.close(CLOSE_UNAUTHORIZED, 'unauthorized')
      return
    }

    // 확인하는 사이 이미 끊고 간 접속에 setupWSConnection 을 걸면 안 된다
    if (conn.readyState !== conn.OPEN) return

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

server.listen(PORT, () => {
  console.log(`mirelab-realtime listening on :${PORT}`)
})
