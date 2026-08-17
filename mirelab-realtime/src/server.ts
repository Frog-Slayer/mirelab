import http from 'http'
import { WebSocketServer } from 'ws'
import { setPersistence, setupWSConnection } from 'y-websocket/bin/utils'
import { springSnapshotPersistence } from './persistence'

setPersistence(springSnapshotPersistence)

const PORT = Number(process.env.PORT ?? 1234)

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

server.listen(PORT, () => {
  console.log(`mirelab-realtime listening on :${PORT}`)
})
