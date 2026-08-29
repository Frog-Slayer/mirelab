import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

/** 이만큼 밀고 손을 떼면 닫는다. 못 미치면 제자리로 돌아온다 */
const DISMISS_DISTANCE = 96
/** 가로로 미는 몸짓인지 세로로 스크롤하는 몸짓인지 가리는 문턱 */
const DIRECTION_SLOP = 8
/** 손을 뗀 뒤 화면 밖으로 빠져나가는 데 주는 시간 */
const FLY_OUT_MS = 180
/** 이만큼 밀렸을 때 가장 옅어진다 — 완전히 투명해지기 전에 멈춰야 뭘 미는지 보인다 */
const FADE_OVER = 220
const MIN_OPACITY = 0.25

/**
 * 손가락으로 오른쪽으로 밀어 없애는 몸짓. 화면 구석에 뜨는 카드처럼 "닫기"가 곁가지인
 * 것들에 쓴다 — 닫기 버튼을 대신하는 게 아니라 그 옆에 하나 더 두는 길이다.
 *
 * 손가락일 때만 듣는다. 마우스에도 걸면 카드를 살짝 끌기만 해도 링크가 안 눌리는데,
 * 마우스에는 이미 겨냥하기 쉬운 닫기 버튼이 있으므로 얻는 것 없이 잃기만 한다.
 *
 * 돌려주는 handlers 와 style 은 움직일 요소에 그대로 펼쳐 넣는다. transition 은 여기서
 * 주지 않는다 — `dragging` 을 보고 쓰는 쪽이 클래스로 붙여야 motion-reduce 를 지킬 수 있다.
 */
export function useSwipeDismiss(onDismiss: () => void) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [flyingOut, setFlyingOut] = useState(false)

  const gesture = useRef<{ x: number; y: number; horizontal: boolean } | null>(null)
  /** 밀어낸 손가락을 떼면 링크의 click 이 뒤따라 온다 — 그 한 번만 삼킨다 */
  const suppressClickRef = useRef(false)

  /**
   * 콜백을 ref 로 받아 두는 이유: 부모가 매 렌더마다 새 함수를 넘기므로 그대로
   * 의존성에 걸면 타이머가 렌더마다 새로 걸리고 취소돼서 영영 울리지 않는다.
   */
  const onDismissRef = useRef(onDismiss)
  useEffect(() => {
    onDismissRef.current = onDismiss
  })

  /**
   * 다 밀려난 뒤 실제로 없애는 건 타이머가 한다. transitionend 를 기다리면
   * 애니메이션이 꺼진 환경(motion-reduce)에서 영영 안 닫힌다.
   */
  useEffect(() => {
    if (!flyingOut) return

    const timer = setTimeout(() => onDismissRef.current(), FLY_OUT_MS)
    return () => clearTimeout(timer)
  }, [flyingOut])

  const release = (element: Element, pointerId: number) => {
    gesture.current = null
    setDragging(false)
    if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    // 새 몸짓이 시작되면 지난 번 밀기의 흔적은 지운다. pointerType 을 가리기 전에 지워야
    // 손가락으로 민 뒤 마우스로 누르는 경우에도 그 클릭이 애먼 곳에서 삼켜지지 않는다.
    suppressClickRef.current = false
    if (event.pointerType !== 'touch' || flyingOut) return

    gesture.current = { x: event.clientX, y: event.clientY, horizontal: false }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const start = gesture.current
    if (!start) return

    const dx = event.clientX - start.x
    const dy = event.clientY - start.y

    if (!start.horizontal) {
      // 세로가 먼저 움직였으면 화면을 굴리려는 것이다 — 이 몸짓에서 손을 뗀다
      if (Math.abs(dy) > DIRECTION_SLOP && Math.abs(dy) >= Math.abs(dx)) {
        gesture.current = null
        return
      }
      if (dx <= DIRECTION_SLOP) return

      start.horizontal = true
      setDragging(true)
      // 손가락이 카드 밖으로 나가도 끝까지 이 요소가 몸짓을 받는다
      event.currentTarget.setPointerCapture(event.pointerId)
    }

    // 왼쪽으로는 가지 않는다 — 되돌아갈 곳이 없는 방향이라 끌리면 고장처럼 보인다
    setOffset(Math.max(0, dx))
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const swiped = gesture.current?.horizontal ?? false
    const far = offset >= DISMISS_DISTANCE

    release(event.currentTarget, event.pointerId)
    if (!swiped) return

    suppressClickRef.current = true
    if (far) setFlyingOut(true)
    else setOffset(0)
  }

  const onPointerCancel = (event: ReactPointerEvent<HTMLElement>) => {
    release(event.currentTarget, event.pointerId)
    setOffset(0)
  }

  return {
    /** 손가락이 카드를 끌고 있는 동안 — 이때만 transition 을 꺼야 손을 따라온다 */
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onClickCapture: (event: { preventDefault: () => void; stopPropagation: () => void }) => {
        if (!suppressClickRef.current) return

        suppressClickRef.current = false
        event.preventDefault()
        event.stopPropagation()
      },
    },
    style: {
      transform: flyingOut ? 'translateX(120%)' : `translateX(${offset}px)`,
      opacity: flyingOut ? 0 : Math.max(MIN_OPACITY, 1 - offset / FADE_OVER),
      // 가로로 미는 동안에는 세로 스크롤만 브라우저에 넘긴다
      touchAction: 'pan-y',
    },
  }
}
