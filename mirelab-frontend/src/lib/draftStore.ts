/**
 * 아직 서버에 못 넣은 글을 이 브라우저에 잠깐 맡아 두는 곳.
 *
 * 자동저장이 실패하면 화면에 남은 글이 유일한 사본이 된다 — 탭을 닫거나 브라우저가 죽으면
 * 그대로 사라진다. 쓰는 동안 localStorage 에도 같이 적어 두면, 다음에 그 자리를 열었을 때
 * "저장 못 한 글이 있다" 고 알려 되살릴 수 있다.
 *
 * 이건 백업이지 저장소가 아니다. 서버에 들어간 게 확인되면 곧바로 지운다 — 남겨 두면
 * 다음에 열 때마다 이미 저장된 글을 두고 "되살릴까요" 를 묻게 된다.
 *
 * localStorage 는 없는 셈 치고 다뤄야 한다. 사생활 보호 창이나 사이트 데이터를 막아 둔
 * 브라우저에서는 읽기·쓰기 자체가 예외를 던진다 — 백업이 안 된다고 글 쓰는 걸 막을 수는 없다.
 */
const PREFIX = 'mirelab.draft.'

export function readDraft(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key)
  } catch {
    return null
  }
}

export function writeDraft(key: string, text: string): void {
  try {
    localStorage.setItem(PREFIX + key, text)
  } catch {
    // 저장 공간이 꽉 찼거나 막혀 있다. 백업이 없을 뿐이니 그냥 넘어간다.
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // 위와 같다
  }
}
