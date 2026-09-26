import { useEffect, useState } from 'react'

/** Tailwind 의 `sm` 아래 — 이 폭에서는 화면 아래 것들이 전부 바닥에 붙는 시트가 된다 */
export const COMPACT_QUERY = '(max-width: 639px)'

/**
 * 화면 폭을 자바스크립트에서 물어본다.
 *
 * 되도록 안 쓰는 게 낫다 — 폭에 따라 모양이 달라지는 것은 CSS(`sm:` 등)가 해야 화면이
 * 리렌더 없이 따라간다. 여기 있는 건 **모양이 아니라 구조가 달라지는** 자리를 위한
 * 것이다: 좁은 화면에서 광고와 메모 작성기가 한 시트로 이어붙는데, 그건 클래스로
 * 감출 수 있는 차이가 아니라 DOM 이 아예 다르다. 양쪽을 다 그려놓고 하나를 숨기면
 * 글 상자가 둘이 되어 어디에 쓴 글인지가 갈린다.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const media = window.matchMedia(query)
    // 구독을 걸기 전에 폭이 바뀌었을 수 있다 — 지금 값을 한 번 맞춰두고 시작한다
    setMatches(media.matches)

    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [query])

  return matches
}
