import * as Y from 'yjs'
import { docs } from 'y-websocket/bin/utils'
import type { Persistence } from 'y-websocket/bin/utils'
import { SPRING_BASE_URL, internalHeaders } from './auth'

// BlockNote 가 프론트에서 collaboration fragment 로 쓰는 이름(CollaborativeBody.tsx 참고).
// 빈 문서인지 판단하려면 결국 이 이름을 알아야 한다 — 이 릴레이가 BlockNote 전용이라 감수한다.
const BLOCKNOTE_FRAGMENT_NAME = 'blocknote'

async function fetchSnapshot(blockId: string): Promise<Uint8Array | null> {
  const res = await fetch(`${SPRING_BASE_URL}/internal/blocks/${blockId}/snapshot`, {
    headers: internalHeaders(),
  })
  if (res.status === 204 || res.status === 404) return null
  if (!res.ok) throw new Error(`snapshot fetch failed: ${res.status}`)
  return new Uint8Array(await res.arrayBuffer())
}

async function pushSnapshot(blockId: string, update: Uint8Array): Promise<void> {
  const res = await fetch(`${SPRING_BASE_URL}/internal/blocks/${blockId}/snapshot`, {
    method: 'POST',
    headers: internalHeaders({ 'Content-Type': 'application/octet-stream' }),
    body: update,
  })
  if (!res.ok) throw new Error(`snapshot push failed: ${res.status}`)
}

async function clearSnapshot(blockId: string): Promise<void> {
  const res = await fetch(`${SPRING_BASE_URL}/internal/blocks/${blockId}/snapshot`, {
    method: 'DELETE',
    headers: internalHeaders(),
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
 * 이 방(room)이 최초 스냅샷을 성공적으로 불러왔는지 — 못 불러왔는데 저장까지
 * 해버리면, 마침 그 사이 Spring 이 회복했을 때 진짜 내용을 빈/부분 문서로
 * 덮어써버린다. 로드 성공 전엔 저장을 아예 건너뛴다.
 */
const safeToPersist = new Set<string>()

async function tryLoadSnapshot(
  docName: string,
  doc: Y.Doc,
  attempts: number,
  delayMs: number,
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      const snapshot = await fetchSnapshot(docName)
      if (snapshot && snapshot.length > 0) {
        Y.applyUpdate(doc, snapshot)
      }
      return true
    } catch (err) {
      console.error(`[persistence] ${docName} 스냅샷 로드 실패 (시도 ${i + 1}/${attempts})`, err)
      if (i < attempts - 1) await wait(delayMs)
    }
  }
  return false
}

/**
 * 최초 로드가 다 실패하면, 방이 열려 있는 동안(다른 곳에서 docs 맵에서 지워질 때까지)
 * 백그라운드에서 계속 재시도한다. 늦게 도착한 스냅샷을 그때 가서 합쳐도(Y.applyUpdate)
 * CRDT라 그 사이 로컬 편집과 안전하게 병합된다 — 재접속을 요구할 필요가 없다.
 */
function scheduleBackgroundReload(docName: string, doc: Y.Doc): void {
  const timer = setInterval(() => {
    if (safeToPersist.has(docName) || !docs.has(docName)) {
      clearInterval(timer)
      return
    }
    tryLoadSnapshot(docName, doc, 1, 0).then((ok) => {
      if (ok) {
        safeToPersist.add(docName)
        clearInterval(timer)
        console.log(`[persistence] ${docName} 스냅샷 로드가 지연 후 성공 — 저장 재개`)
      }
    })
  }, 3000)
}

/**
 * writeState 는 마지막 접속자가 나갈 때 한 번만 불리는데, 그 사이 릴레이가
 * 죽거나 재시작되면 메모리에만 있던 편집분이 통째로 날아간다 — 주기적으로도
 * 같은 경로로 저장해서 유실 구간을 짧게 줄인다. 실패하면 한 번 재시도한다.
 */
export async function saveSnapshot(docName: string, doc: Y.Doc): Promise<void> {
  if (!safeToPersist.has(docName)) {
    console.warn(`[persistence] ${docName} 최초 로드가 아직 안 끝나서 저장을 건너뜀`)
    return
  }

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
    const ok = await tryLoadSnapshot(docName, doc, 3, 500)
    if (ok) {
      safeToPersist.add(docName)
    } else {
      console.error(`[persistence] ${docName} 최초 스냅샷 로드 실패 — 복구될 때까지 저장을 보류`)
      scheduleBackgroundReload(docName, doc)
    }
  },
  writeState: async (docName, doc) => {
    await saveSnapshot(docName, doc)
    // 다음에 이 방이 다시 열릴 때(새 WSSharedDoc) 이전 세션의 "로드 성공" 상태가
    // 새어들어가지 않도록 지운다 — 재개장 때는 다시 처음부터 로드를 확인해야 한다.
    safeToPersist.delete(docName)
  },
}
