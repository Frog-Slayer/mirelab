import { useCallback, useEffect, useRef, useState } from 'react'

/** 저장이 실패했을 때 다시 보내기까지 기다리는 시간. 실패가 이어지면 두 배씩 늘린다 */
const RETRY_BASE_MS = 2_000
const RETRY_MAX_MS = 30_000

/**
 * 입력값을 로컬에서 즉시 반영하고, 잠시 뒤 저장한다.
 * 제출 버튼을 기다리게 하면 개인 정리를 여기서 안 하게 된다.
 *
 * `save` 가 약속(Promise)을 돌려주면 두 가지를 더 해준다:
 *
 * - 저장들을 한 줄로 세워 차례로 보낸다. 저장 요청은 나가는 순서대로 도착하지 않는다 —
 *   먼저 보낸 것이 늦게 닿으면 옛 값이 새 값을 덮는다.
 * - 실패하면 물러났다가 다시 보낸다(2초 → 4초 → … → 30초). 실패의 대부분은 잠깐 끊긴
 *   연결이라 몇 초 뒤면 붙는다.
 */
export function useDebouncedSave<T>(
  initial: T,
  save: (value: T) => void | Promise<unknown>,
  ms = 600,
) {
  const [value, setValue] = useState(initial)
  const saveRef = useRef(save)
  saveRef.current = save

  const dirty = useRef(false)

  /** 타이머는 걸렸지만 아직 안 보낸 값. 보내고 나면 비운다 */
  const pending = useRef<{ value: T } | null>(null)
  /** 보낸 것들의 줄 — 앞의 것이 끝나야 뒤의 것이 나간다 */
  const queue = useRef<Promise<unknown>>(Promise.resolve())

  /** 이어진 실패 횟수 — 다시 보내기까지 얼마나 기다릴지가 여기서 나온다 */
  const attempt = useRef(0)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // 타입을 적어 주는 이유: 아래 본문이 flush 자신을 부르는데, 그러면 반환형을 추론하다
  // 자기 자신을 다시 보게 돼서 타입이 any 로 무너진다.
  const flush: () => void = useCallback(() => {
    const next = pending.current
    if (!next) return

    pending.current = null
    queue.current = queue.current
      .then(() => saveRef.current(next.value))
      .then(() => {
        attempt.current = 0
      })
      .catch(() => {
        // 못 보낸 값을 대기 자리로 되돌린다. 그 사이 새로 친 글자가 들어와 있으면 그쪽이
        // 최신이므로 건드리지 않는다 — 되돌렸다가는 방금 친 글자를 옛 값으로 덮는다.
        if (!pending.current) pending.current = next

        const wait = Math.min(RETRY_BASE_MS * 2 ** attempt.current, RETRY_MAX_MS)
        attempt.current += 1
        clearTimeout(retryTimer.current)
        retryTimer.current = setTimeout(flush, wait)
      })
  }, [])

  // 사라진 뒤에도 타이머가 남아 다시 보내는 일이 없게. 그때 못 보낸 글은 화면 쪽에서
  // 브라우저에 맡겨 둔 사본([draftStore])이 받는다.
  useEffect(() => () => clearTimeout(retryTimer.current), [])

  /**
   * 다른 회차로 이동하는 등 바깥에서 값이 바뀐 경우 — 다만 한 번이라도 손을 댄 뒤에는
   * 따라가지 않는다.
   *
   * 서버에서 값이 돌아오는 건 내가 글자를 치는 도중일 수도 있다(저장 뒤 다시 받아오기,
   * 주기적인 폴링). 그때 그대로 setValue 해버리면 방금 친 글자가 서버에 있던 옛 값으로
   * 되돌아간다 — 쓰는 사람 눈에는 글자가 저절로 지워지는 것으로 보인다.
   */
  const initialRef = useRef(initial)
  useEffect(() => {
    if (dirty.current) return
    if (JSON.stringify(initialRef.current) !== JSON.stringify(initial)) {
      initialRef.current = initial
      setValue(initial)
    }
  }, [initial])

  useEffect(() => {
    if (!dirty.current) return

    pending.current = { value }
    const timer = setTimeout(flush, ms)
    return () => clearTimeout(timer)
  }, [value, ms, flush])

  /**
   * 사라지기 전에 아직 안 보낸 것이 있으면 그 자리에서 보낸다. 위 effect 의 청소는
   * 타이머를 지울 뿐이라, 이게 없으면 마지막 입력 후 ms 안에 화면을 뜨거나 서랍을 닫은
   * 편집이 그대로 사라진다.
   *
   * 청소 함수는 적은 순서대로 돈다 — 타이머가 먼저 지워지고 그다음 여기서 보내므로,
   * 같은 값이 두 번 나가지 않는다.
   */
  useEffect(() => () => flush(), [flush])

  const update = (next: T) => {
    dirty.current = true
    setValue(next)
  }

  return [value, update] as const
}
