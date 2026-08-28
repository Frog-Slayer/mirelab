import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'

const LONG_PRESS_DELAY = 500
const LONG_PRESS_MOVE_TOLERANCE = 10

/**
 * 터치의 짧은 탭은 링크로 보내고, 길게 누를 때만 미리보기를 연다.
 * 손가락으로 스크롤하기 시작하면 롱프레스를 취소하며, 미리보기를 연 터치는 링크 클릭으로
 * 이어지지 않게 막는다.
 *
 * 돌려주는 handlers 는 링크(a) 에 그대로 펼쳐 넣는다. onContextMenu 를 막고 있으므로
 * 길게 눌러도 브라우저 기본 메뉴(우클릭 메뉴)가 뜨지 않는다 — 그 자리를 미리보기가 쓴다.
 */
export function useLongPressPreview(onActivate?: () => void) {
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startRef = useRef({ x: 0, y: 0 })
  const suppressClickRef = useRef(false)

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => clearTimer, [])

  useEffect(() => {
    if (!open) return

    const close = () => setOpen(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const onPointerDown = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== 'touch') return

    clearTimer()
    startRef.current = { x: event.clientX, y: event.clientY }
    suppressClickRef.current = false
    timerRef.current = setTimeout(() => {
      suppressClickRef.current = true
      setOpen(true)
      onActivate?.()
      timerRef.current = null
    }, LONG_PRESS_DELAY)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== 'touch' || timerRef.current === null) return

    const dx = event.clientX - startRef.current.x
    const dy = event.clientY - startRef.current.y
    if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOLERANCE) clearTimer()
  }

  const onClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (!suppressClickRef.current) return

    event.preventDefault()
    event.stopPropagation()
    suppressClickRef.current = false
  }

  return {
    open,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: clearTimer,
      onPointerCancel: clearTimer,
      onClick,
      onContextMenu: (event: ReactMouseEvent<HTMLAnchorElement>) => event.preventDefault(),
    },
  }
}
