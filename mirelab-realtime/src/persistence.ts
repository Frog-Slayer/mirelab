import * as Y from 'yjs'
import type { Persistence } from 'y-websocket/bin/utils'

const SPRING_BASE_URL = process.env.SPRING_BASE_URL ?? 'http://localhost:8080'

async function fetchSnapshot(blockId: string): Promise<Uint8Array | null> {
  const res = await fetch(`${SPRING_BASE_URL}/internal/blocks/${blockId}/snapshot`)
  if (res.status === 204 || res.status === 404) return null
  if (!res.ok) throw new Error(`snapshot fetch failed: ${res.status}`)
  return new Uint8Array(await res.arrayBuffer())
}

async function pushSnapshot(blockId: string, update: Uint8Array): Promise<void> {
  const res = await fetch(`${SPRING_BASE_URL}/internal/blocks/${blockId}/snapshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: update,
  })
  if (!res.ok) throw new Error(`snapshot push failed: ${res.status}`)
}

/**
 * docName 은 곧 블록(WorkBlock) id 다 — 방(room) 하나가 블록 하나에 대응한다.
 * bindState 는 방이 처음 열릴 때(첫 접속자) 한 번, writeState 는 마지막 접속자가
 * 나갈 때 한 번 호출된다 — y-websocket/bin/utils 의 계약.
 */
export const springSnapshotPersistence: Persistence = {
  bindState: async (docName, doc) => {
    try {
      const snapshot = await fetchSnapshot(docName)
      if (snapshot && snapshot.length > 0) {
        Y.applyUpdate(doc, snapshot)
      }
    } catch (err) {
      console.error(`[persistence] ${docName} 스냅샷을 불러오지 못함`, err)
    }
  },
  writeState: async (docName, doc) => {
    try {
      const update = Y.encodeStateAsUpdate(doc)
      await pushSnapshot(docName, update)
    } catch (err) {
      console.error(`[persistence] ${docName} 스냅샷을 저장하지 못함`, err)
    }
  },
}
