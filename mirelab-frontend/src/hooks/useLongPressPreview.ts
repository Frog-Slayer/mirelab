import {
  useEffect,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
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
  const [hovered, setHovered] = useState(false)
  /**
   * 미리보기의 기준이 되는 요소. ref 대신 이벤트의 currentTarget 으로 잡는다 — 링크가
   * ref 를 안으로 넘겨주는지에 기대지 않아도 되고, 실제로 가리킨 그 요소가 확실히 잡힌다.
   */
  const [anchor, setAnchor] = useState<HTMLAnchorElement | null>(null)
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

    setAnchor(event.currentTarget)
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
    /** 마우스를 올렸거나(데스크톱) 길게 눌렀을 때(터치) */
    open: hovered || open,
    anchor,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: clearTimer,
      onPointerCancel: clearTimer,
      onClick,
      onContextMenu: (event: ReactMouseEvent<HTMLAnchorElement>) => event.preventDefault(),
      onMouseEnter: (event: ReactMouseEvent<HTMLAnchorElement>) => {
        setAnchor(event.currentTarget)
        setHovered(true)
      },
      onMouseLeave: () => setHovered(false),
      // 키보드로 표지를 훑을 때도 마우스와 같은 미리보기가 뜬다 — 예전에는 CSS
      // group-focus-within 이 하던 일이라, 카드를 JS 로 띄우게 바꾸면서 여기로 옮겼다.
      onFocus: (event: ReactFocusEvent<HTMLAnchorElement>) => {
        setAnchor(event.currentTarget)
        setHovered(true)
      },
      onBlur: () => setHovered(false),
    },
  }
}
