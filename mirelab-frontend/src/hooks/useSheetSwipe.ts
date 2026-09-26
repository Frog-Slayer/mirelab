import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

/** 아래로 이만큼 밀고 손을 떼면 접는다 */
const COLLAPSE_DISTANCE = 96
/** 위로 이만큼 끌어올리면 펼친다. 의도하지 않은 짧은 화면 스크롤과 확실히 가른다 */
const EXPAND_DISTANCE = 104
/** 세로로 미는 몸짓인지 가로로 훑는 몸짓인지 가리는 문턱 */
const DIRECTION_SLOP = 8
/** 손을 뗀 뒤 화면 아래로 빠져나가는 데 주는 시간 */
const FLY_OUT_MS = 180
/** 이만큼 밀렸을 때 가장 옅어진다 — 완전히 투명해지기 전에 멈춰야 뭘 미는지 보인다 */
const FADE_OVER = 220
const MIN_OPACITY = 0.25

/**
 * 화면 바닥에 눕는 것을 손가락으로 여닫는 몸짓. 아래로 밀면 접히고, 위로 끌어올리면
 * 펼쳐진다 — 광고 띠에서 메모 작성기로 넘어가는 길이 그것이다.
 *
 * 전에 있던 `useSwipeDismiss`(가로로 밀어 없애기)를 세로로 옮기고 방향을 하나 더 받는
 * 것으로 갈음했다. 미는 대상이 전부 바닥에 눕는 것들이 되면서 가로 축은 쓸 곳이 없어졌다.
 *
 * 손가락일 때만 듣는다. 마우스에도 걸면 카드를 살짝 끌기만 해도 버튼이 안 눌리는데,
 * 마우스에는 이미 겨냥하기 쉬운 닫기 버튼이 있으므로 얻는 것 없이 잃기만 한다.
 *
 * `onUp` 을 안 주면 위로는 안 끌린다. 데스크톱에서 "위로 올려 펼치기" 를 없애는 건 이걸
 * 안 주는 게 아니라 손잡이 자체를 안 그리는 쪽으로 한다([ThisSessionAd]) — 손잡이가 없으면
 * 몸짓이 시작될 자리도 없다.
 *
 * 돌려주는 handlers 는 손잡이에, style 은 움직일 요소에 펼쳐 넣는다. 둘이 다른 요소여도
 * 된다 — 글 상자까지 끌리게 하고 싶지 않을 때 그렇게 쓴다. transition 은 여기서 주지
 * 않는다: `dragging` 을 보고 쓰는 쪽이 클래스로 붙여야 motion-reduce 를 지킬 수 있다.
 */
export function useSheetSwipe({ onUp, onDown }: { onUp?: () => void; onDown: () => void }) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [flyingOut, setFlyingOut] = useState(false)

  const gesture = useRef<{ x: number; y: number; vertical: boolean } | null>(null)
  /** 밀어낸 손가락을 떼면 아래 있던 것의 click 이 뒤따라 온다 — 그 한 번만 삼킨다 */
  const suppressClickRef = useRef(false)

  /**
   * 콜백을 ref 로 받아 두는 이유: 부모가 매 렌더마다 새 함수를 넘기므로 그대로
   * 의존성에 걸면 타이머가 렌더마다 새로 걸리고 취소돼서 영영 울리지 않는다.
   */
  const onDownRef = useRef(onDown)
  const onUpRef = useRef(onUp)
  useEffect(() => {
    onDownRef.current = onDown
    onUpRef.current = onUp
  })

  /**
   * 다 밀려난 뒤 실제로 접는 건 타이머가 한다. transitionend 를 기다리면
   * 애니메이션이 꺼진 환경(motion-reduce)에서 영영 안 닫힌다.
   */
  useEffect(() => {
    if (!flyingOut) return

    const timer = setTimeout(() => onDownRef.current(), FLY_OUT_MS)
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

    gesture.current = { x: event.clientX, y: event.clientY, vertical: false }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const start = gesture.current
    if (!start) return

    const dx = event.clientX - start.x
    const dy = event.clientY - start.y

    if (!start.vertical) {
      // 가로가 먼저 움직였으면 이 몸짓은 우리 것이 아니다
      if (Math.abs(dx) > DIRECTION_SLOP && Math.abs(dx) > Math.abs(dy)) {
        gesture.current = null
        return
      }
      if (Math.abs(dy) <= DIRECTION_SLOP) return

      start.vertical = true
      setDragging(true)
      // 손가락이 시트 밖으로 나가도 끝까지 이 요소가 몸짓을 받는다
      event.currentTarget.setPointerCapture(event.pointerId)
    }

    // 펼칠 곳이 없으면 위로는 안 끌린다 — 끌리는데 아무 일도 안 일어나면 고장처럼 보인다
    setOffset(onUpRef.current ? dy : Math.max(0, dy))
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const swiped = gesture.current?.vertical ?? false
    release(event.currentTarget, event.pointerId)
    if (!swiped) return

    suppressClickRef.current = true

    if (offset >= COLLAPSE_DISTANCE) {
      setFlyingOut(true)
      return
    }
    // 펼치는 쪽은 날려보내지 않는다 — 그 자리에서 작성기로 자라나는 것이라 제자리로
    // 되돌려 놓고 넘긴다. 안 그러면 새 모습이 위로 밀린 채 그려진다.
    setOffset(0)
    if (offset <= -EXPAND_DISTANCE) onUpRef.current?.()
  }

  const onPointerCancel = (event: ReactPointerEvent<HTMLElement>) => {
    release(event.currentTarget, event.pointerId)
    setOffset(0)
  }

  return {
    /** 손가락이 시트를 끌고 있는 동안 — 이때만 transition 을 꺼야 손을 따라온다 */
    dragging,
    /** 위로 끌어올린 만큼(0–1). 같은 시트 안의 접힌 내용을 손가락과 함께 펼치는 데 쓴다 */
    expandProgress: Math.min(1, Math.max(0, -offset / EXPAND_DISTANCE)),
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
      // 아래로 밀 때는 판이 손가락을 따라가지만, 위로 밀 때는 판을 옮기지 않는다.
      // 그 거리는 호출부가 접힌 내용을 여는 데 써서 판 자체가 위로 자라게 한다.
      transform: flyingOut ? 'translateY(120%)' : `translateY(${Math.max(0, offset)}px)`,
      // 접히는 쪽으로 갈 때만 옅어진다. 펼치는 쪽은 사라지는 게 아니라 자라나는 것이다.
      opacity: flyingOut ? 0 : Math.max(MIN_OPACITY, 1 - Math.max(0, offset) / FADE_OVER),
      // 세로로 미는 동안에는 브라우저가 화면을 굴리지 못하게 한다
      touchAction: 'none',
    },
  }
}
