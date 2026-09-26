/**
 * "이건 당분간 그만 보여 달라" 를 이 브라우저에 적어 두는 곳.
 *
 * 화면을 통째로 덮는 것([ThisSessionAd])에는 두 가지 닫기가 필요하다. 지금 이 화면에서만
 * 치우는 것과, 한동안 아예 안 뜨게 하는 것. 앞의 것은 React state 면 충분하지만 — 새로고침
 * 하면 다시 떠도 되는 게 그 뜻이다 — 뒤의 것은 탭을 닫아도 남아야 해서 여기에 적는다.
 *
 * 영구히 "봤다" 로 적지 않고 기한을 두는 이유: 모임은 며칠 뒤에 있고 그동안 마음이 바뀐다.
 * 한 번 닫았다고 영영 안 보여주면, 정작 전날 저녁에 들어온 사람에게 아무 말도 안 하게 된다.
 *
 * [draftStore] 와 같은 규칙을 따른다: localStorage 는 없는 셈 치고 다뤄야 한다. 사생활 보호
 * 창에서는 읽기·쓰기 자체가 예외를 던지므로, 그때는 "안 미뤘다" 로 떨어진다 — 한 번 더 뜨는
 * 것이 화면이 안 뜨는 것보다 낫다.
 */
const PREFIX = 'mirelab.snooze.'

export const ONE_DAY_MS = 86_400_000

export function isSnoozed(key: string): boolean {
  try {
    const until = Number(localStorage.getItem(PREFIX + key))
    // 값이 없으면 Number(null) 이 0 이라 여기서 같이 걸린다. 못 읽을 값도 마찬가지.
    if (!until || !Number.isFinite(until)) return false
    if (until > Date.now()) return true

    // 기한이 지난 것은 읽은 김에 거둔다 — 안 그러면 지난 모임의 열쇠가 계속 쌓인다
    localStorage.removeItem(PREFIX + key)
    return false
  } catch {
    return false
  }
}

export function snooze(key: string, ms: number): void {
  try {
    localStorage.setItem(PREFIX + key, String(Date.now() + ms))
    sweepExpired()
  } catch {
    // 저장소가 막혀 있다. 이번 화면에서만 닫힌 것으로 남는다(부르는 쪽의 state 가 받는다).
  }
}

/**
 * 다시 열어보지 않는 모임의 열쇠는 [isSnoozed] 의 자가 청소가 닿지 않는다 — 그 함수는
 * 물어본 열쇠만 본다. 새로 하나 적을 때 지난 것들을 같이 쓸어낸다.
 */
function sweepExpired(): void {
  const now = Date.now()
  const stale: string[] = []

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key?.startsWith(PREFIX)) continue
    const until = Number(localStorage.getItem(key))
    if (!until || !Number.isFinite(until) || until <= now) stale.push(key)
  }

  // 도는 도중에 지우면 인덱스가 밀려 건너뛰는 것이 생긴다 — 다 세고 나서 지운다
  stale.forEach((key) => localStorage.removeItem(key))
}
