/**
 * 마지막으로 보던 화면. 다시 로그인했을 때 홈이 아니라 그 자리로 돌려보내려고 적어 둔다.
 *
 * 사람 것으로 묶어 둔다. 한 브라우저를 둘이 나눠 쓰면(모임 자리의 노트북 한 대) 앞사람이
 * 보던 화면으로 뒷사람이 떨어지는데, 그게 남의 작품 상세면 접근이 막혀 "참여 중인 스터디가
 * 아닙니다" 부터 보게 된다. 주인이 다르면 그냥 없는 셈 친다.
 *
 * [draftStore] 와 같은 규칙 — localStorage 는 없는 셈 치고 다룬다. 못 읽으면 홈으로 가면
 * 될 뿐이라 실패가 아프지 않은 쪽이다.
 */
const KEY = 'mirelab.last-page'

interface LastPage {
  userId: string
  path: string
}

export function readLastPage(userId: string): string | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null

    const value = JSON.parse(raw) as Partial<LastPage>
    if (value.userId !== userId || typeof value.path !== 'string') return null
    return isSafePath(value.path) ? value.path : null
  } catch {
    // 없거나, 남이 손댔거나, 저장소가 막혀 있다. 셋 다 "기억 못 함" 으로 같다.
    return null
  }
}

export function writeLastPage(userId: string, path: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ userId, path } satisfies LastPage))
  } catch {
    // 적어 둘 곳이 없으면 다음 로그인은 홈으로 간다. 그뿐이다.
  }
}

/**
 * 이 값은 그대로 navigate() 에 들어간다. `//evil.com` 은 경로처럼 생겼지만 브라우저가
 * 프로토콜 상대 URL 로 읽어서 진짜 다른 사이트로 나가버리므로, 슬래시 하나로 시작하는
 * 우리 경로만 통과시킨다.
 */
function isSafePath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//')
}

/**
 * 마지막 페이지로 되돌린 이동이라는 표시. 그 자리가 그새 사라졌을 수도 있어서 — 지워진
 * 작품, 빠져나온 스터디 — 착지에 실패하면 안내 화면 대신 홈으로 흘려보낸다.
 *
 * 이 표시를 다는 이유는 실패를 겪는 화면이 "왜 여기 왔는지" 를 모르기 때문이다. 사람이
 * 죽은 링크를 눌러서 온 것이라면 "없는 작품입니다" 를 보여주는 게 맞고, 로그인하자마자
 * 자동으로 끌려온 것이라면 그 안내는 사고처럼 읽힌다. 둘을 가르는 건 이 한 조각뿐이다.
 *
 * 이동 state 는 history 항목마다 따로라, 되돌아온 자리에서 한 발짝만 움직여도 사라진다.
 */
export const RESTORED_STATE = { restored: true }

export function isRestoredNavigation(state: unknown): boolean {
  return typeof state === 'object' && state !== null && 'restored' in state
}
