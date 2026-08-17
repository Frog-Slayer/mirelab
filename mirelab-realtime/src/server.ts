import http from 'http'
import { WebSocketServer } from 'ws'
import { docs, setPersistence, setupWSConnection } from 'y-websocket/bin/utils'
import { saveSnapshot, springSnapshotPersistence } from './persistence'

setPersistence(springSnapshotPersistence)

const PORT = Number(process.env.PORT ?? 1234)
const PERSIST_INTERVAL_MS = Number(process.env.PERSIST_INTERVAL_MS ?? 5000)

// URL 경로가 곧 방 이름(=블록 id) — /yjs/<blockId> 로 접속한다.
const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('mirelab-realtime ok')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (conn, req) => {
  const docName = (req.url ?? '').replace(/^\/yjs\//, '').split('?')[0]
  setupWSConnection(conn, req, { docName })
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
