import { useEffect, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { useCreateBlockNote } from '@blocknote/react'
import { withCollaboration } from '@blocknote/core/yjs'
import { BlockNoteView } from '@blocknote/shadcn'
import '@blocknote/shadcn/style.css'
import { ApiError } from '@/lib/api'
import { issueRealtimeTicket } from '@/lib/workBlockApi'
import type { User } from '@/types'

// /api 와 같은 이유로 same-origin 기본값을 쓴다 — "localhost"를 박아두면 tailscale 같은
// 다른 호스트로 접속했을 때 브라우저가 자기 자신의 localhost로 붙으려 든다.
const REALTIME_URL =
  import.meta.env.VITE_REALTIME_URL ??
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/yjs`

// User.color 는 tailwind 클래스 문자열이라(예: "bg-emerald-500"), 커서 렌더링엔 실제
// 색상 값이 필요하다. 지금 쓰는 4가지 색만 매핑해둔다.
const COLOR_HEX: Record<string, string> = {
  'bg-emerald-500': '#10b981',
  'bg-sky-500': '#0ea5e9',
  'bg-amber-500': '#f59e0b',
  'bg-rose-500': '#f43f5e',
}

interface YjsConnection {
  doc: Y.Doc
  provider: WebsocketProvider
}

/**
 * 블록 하나의 본문 — Yjs 공유 문서를 BlockNote 에디터로 그린다.
 * blockId 가 곧 실시간 서버의 방(room) 이름이다.
 */
export default function CollaborativeBody({ blockId, user }: { blockId: string; user: User }) {
  const [conn, setConn] = useState<YjsConnection | null>(null)

  useEffect(() => {
    const doc = new Y.Doc()
    const params: Record<string, string> = {}
    // 일회용 티켓은 자동 재접속에 재사용할 수 없다. provider 의 내장 재접속을 끄고,
    // 접속 시도마다 REST로 새 티켓을 받은 다음 connect 한다.
    const provider = new WebsocketProvider(REALTIME_URL, blockId, doc, {
      connect: false,
      params,
      shouldReconnect: () => false,
    })
    let disposed = false
    let ticketRequestInFlight = false
    let retryCount = 0
    let retryTimer: number | null = null

    const scheduleConnect = (delayMs: number) => {
      if (disposed || retryTimer !== null) return
      retryTimer = window.setTimeout(() => {
        retryTimer = null
        void connectWithFreshTicket()
      }, delayMs)
    }

    const connectWithFreshTicket = async () => {
      if (disposed || ticketRequestInFlight || provider.ws !== null) return
      ticketRequestInFlight = true

      try {
        const { value } = await issueRealtimeTicket(blockId)
        ticketRequestInFlight = false
        if (disposed) return

        params.ticket = value
        provider.connect()
      } catch (err) {
        ticketRequestInFlight = false
        if (disposed) return

        // 권한·존재·로그인 문제는 같은 요청을 반복해도 달라지지 않는다. 네트워크나 서버의
        // 일시 오류만 지수 backoff 로 다시 시도한다.
        if (err instanceof ApiError && [401, 403, 404].includes(err.status)) return
        retryCount += 1
        scheduleConnect(Math.min(250 * 2 ** retryCount, 10_000))
      }
    }

    const handleConnectionClose = () => {
      // close 처리 중 y-websocket 이 예약하는 재접속이 소비된 티켓을 쓰지 못하게 즉시 끈다.
      provider.shouldConnect = false
      delete params.ticket
      retryCount += 1
      scheduleConnect(Math.min(250 * 2 ** retryCount, 10_000))
    }

    const handleSync = (synced: boolean) => {
      if (synced) retryCount = 0
    }

    provider.on('connection-close', handleConnectionClose)
    provider.on('sync', handleSync)
    setConn({ doc, provider })
    void connectWithFreshTicket()

    return () => {
      disposed = true
      if (retryTimer !== null) window.clearTimeout(retryTimer)
      provider.off('connection-close', handleConnectionClose)
      provider.off('sync', handleSync)
      provider.destroy()
      doc.destroy()
      setConn(null)
    }
  }, [blockId])

  return conn ? <Editor conn={conn} user={user} /> : null
}

function Editor({ conn, user }: { conn: YjsConnection; user: User }) {
  const editor = useCreateBlockNote(
    withCollaboration({
      collaboration: {
        fragment: conn.doc.getXmlFragment('blocknote'),
        user: { name: user.name, color: COLOR_HEX[user.color] ?? '#737373' },
        provider: { awareness: conn.provider.awareness },
      },
    }),
    [conn],
  )

  return <BlockNoteView editor={editor} />
}
