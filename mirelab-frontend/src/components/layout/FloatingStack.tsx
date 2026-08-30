import { createContext, useContext, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * 화면 오른쪽 아래에 뜨는 것들(다음 모임 카드, 페이지별 플로팅 버튼)이 서로 겹치지 않게
 * 한 자리에 모아 위에서부터 쌓는다.
 *
 * 각자 `fixed right-4 bottom-4` 를 따로 걸면 정확히 같은 칸을 두고 싸우게 되고, 한쪽을
 * `bottom-32` 처럼 눈대중으로 띄워두면 옆 카드의 높이가 바뀌는 순간(혹은 아예 안 뜨는
 * 날) 어긋난다. 그래서 위치는 이 컨테이너만 알고, 내용물은 순서만 갖는다.
 */
const SlotContext = createContext<HTMLDivElement | null>(null)

export function FloatingStack({
  children,
  shifted = false,
  liftedBy = 0,
}: {
  children: ReactNode
  /** 오른쪽에서 "내 메모" 서랍이 나와 있는 동안 — 그 앞을 가리지 않게 비켜선다 */
  shifted?: boolean
  /**
   * 화면 바닥에 뭔가 눕고 있는 동안(광고 띠) 그 높이만큼 위로 올라선다. px 로 받는 이유는
   * 그 높이가 내용에 따라 달라져서다 — 눈대중으로 `bottom-32` 를 박아두면 띠가 한 줄
   * 늘어나는 순간 [AllWorksPage] 의 '작품 추가' 버튼이 그 뒤로 숨는다.
   */
  liftedBy?: number
}) {
  // ref 대신 state 로 받는다 — 포털은 붙일 DOM 노드가 생긴 뒤 한 번 더 그려져야 한다.
  const [slot, setSlot] = useState<HTMLDivElement | null>(null)

  return (
    <SlotContext.Provider value={slot}>
      {/*
        컨테이너 자체는 클릭을 먹지 않는다 — 비어 있을 때 화면 구석을 가로막지 않도록.
        실제로 눌리는 건 안에 들어오는 것들이며, 각자 pointer-events 를 되살린다.
      */}
      {/*
        서랍이 열려 있을 때: 넓은 화면(xl 이상)에서는 서랍 폭(28rem)만큼 왼쪽으로 비켜서고,
        좁은 화면에서는 아예 숨는다 — 거기서는 서랍이 화면을 덮으므로 비켜설 자리가 없다.
      */}
      <div
        style={{ bottom: `calc(1rem + ${liftedBy}px)` }}
        className={`pointer-events-none fixed z-40 flex flex-col items-end gap-3 transition-[right,bottom] duration-150 ease-out motion-reduce:transition-none ${
          shifted ? 'right-4 max-xl:hidden xl:right-[29rem]' : 'right-4'
        }`}
      >
        {/* 페이지가 끼워 넣는 자리 — 모임 카드보다 위에 쌓인다 */}
        <div ref={setSlot} className="pointer-events-auto contents" />
        {children}
      </div>
    </SlotContext.Provider>
  )
}

/** 페이지에서 오른쪽 아래 스택에 무언가를 얹고 싶을 때 쓴다 */
export function FloatingAction({ children }: { children: ReactNode }) {
  const slot = useContext(SlotContext)
  if (!slot) return null

  return createPortal(children, slot)
}
