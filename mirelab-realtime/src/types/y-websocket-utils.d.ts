// y-websocket@2.0.4 는 서버 유틸(bin/utils.cjs)에 타입 선언이 없다 — 쓰는 만큼만 선언한다.
declare module 'y-websocket/bin/utils' {
  import type { IncomingMessage } from 'http'
  import type { WebSocket } from 'ws'
  import type { Doc } from 'yjs'

  export interface Persistence {
    bindState: (docName: string, doc: Doc) => void | Promise<void>
    writeState: (docName: string, doc: Doc) => Promise<unknown>
    provider?: unknown
  }

  export function setupWSConnection(
    conn: WebSocket,
    req: IncomingMessage,
    opts?: { docName?: string; gc?: boolean },
  ): void

  export function setPersistence(persistence: Persistence | null): void
  export function getPersistence(): Persistence | null
  export function getYDoc(docName: string, gc?: boolean): Doc
}
