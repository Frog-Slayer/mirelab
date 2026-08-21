import { useEffect, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { useCreateBlockNote } from '@blocknote/react'
import { withCollaboration } from '@blocknote/core/yjs'
import { BlockNoteView } from '@blocknote/shadcn'
import '@blocknote/shadcn/style.css'
import { getAccessToken, onAccessTokenChange } from '@/lib/api'
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

/**
 * 실시간 서버에 넘기는 접속 파라미터 — 릴레이가 이 토큰으로 백엔드에 "이 사람이 이 방에
 * 들어와도 되나" 를 물어본다.
 *
 * 객체 하나를 공유하고 내용만 갈아끼우는 이유: y-websocket 은 재접속할 때마다
 * `provider.params` 를 다시 읽어 URL 을 만든다. 그래서 토큰이 갱신된 뒤 끊겼다 붙으면
 * 새 토큰이 저절로 실린다 — provider 를 다시 만들 필요가 없다.
 */
const connectionParams: Record<string, string> = {}

function syncToken(token: string | null) {
  if (token) connectionParams.token = token
  else delete connectionParams.token
}

syncToken(getAccessToken())
onAccessTokenChange(syncToken)

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
    const provider = new WebsocketProvider(REALTIME_URL, blockId, doc, { params: connectionParams })
    setConn({ doc, provider })
    return () => {
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

  return <BlockNoteView editor={editor} theme="light" className="work-block-editor" />
}
