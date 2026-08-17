import * as Y from 'yjs'
import type { Persistence } from 'y-websocket/bin/utils'

const SPRING_BASE_URL = process.env.SPRING_BASE_URL ?? 'http://localhost:8080'

// BlockNote 가 프론트에서 collaboration fragment 로 쓰는 이름(CollaborativeBody.tsx 참고).
// 빈 문서인지 판단하려면 결국 이 이름을 알아야 한다 — 이 릴레이가 BlockNote 전용이라 감수한다.
const BLOCKNOTE_FRAGMENT_NAME = 'blocknote'

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

async function clearSnapshot(blockId: string): Promise<void> {
  const res = await fetch(`${SPRING_BASE_URL}/internal/blocks/${blockId}/snapshot`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`snapshot clear failed: ${res.status}`)
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 문서 안의 실제 글자만 뽑아온다. 빈 문단 하나뿐인, 아무도 안 건드린 문서도
 * Y.encodeStateAsUpdate 결과는 빈 바이트 배열이 아니라서, "스냅샷이 null 이 아니다"
 * 만으로는 진짜 내용이 있는지 알 수 없다 — 구조를 걷어보고 텍스트 유무로 판단한다.
 */
function extractPlainText(node: Y.XmlFragment | Y.XmlElement): string {
  return node
    .toArray()
    .map((item) => {
      if (item instanceof Y.XmlText) return item.toString()
      if (item instanceof Y.XmlElement) return extractPlainText(item)
      return ''
    })
    .join('')
}

function hasMeaningfulContent(doc: Y.Doc): boolean {
  const fragment = doc.getXmlFragment(BLOCKNOTE_FRAGMENT_NAME)
  return extractPlainText(fragment).trim().length > 0
}

/**
 * writeState 는 마지막 접속자가 나갈 때 한 번만 불리는데, 그 사이 릴레이가
 * 죽거나 재시작되면 메모리에만 있던 편집분이 통째로 날아간다 — 주기적으로도
 * 같은 경로로 저장해서 유실 구간을 짧게 줄인다. 실패하면 한 번 재시도한다.
 */
export async function saveSnapshot(docName: string, doc: Y.Doc): Promise<void> {
  const save = hasMeaningfulContent(doc)
    ? () => pushSnapshot(docName, Y.encodeStateAsUpdate(doc))
    : () => clearSnapshot(docName)

  try {
    await save()
  } catch (err) {
    console.error(`[persistence] ${docName} 스냅샷 저장 실패, 1회 재시도`, err)
    await wait(500)
    try {
      await save()
    } catch (retryErr) {
      console.error(`[persistence] ${docName} 스냅샷 저장 재시도도 실패`, retryErr)
    }
  }
}

/**
 * docName 은 곧 블록(WorkBlock) id 다 — 방(room) 하나가 블록 하나에 대응한다.
 * bindState 는 방이 처음 열릴 때(첫 접속자) 한 번, writeState 는 마지막 접속자가
 * 나갈 때 한 번 호출된다 — y-websocket/bin/utils 의 계약. 그 사이 구간은
 * server.ts 의 주기 저장이 메운다.
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
  writeState: (docName, doc) => saveSnapshot(docName, doc),
}
