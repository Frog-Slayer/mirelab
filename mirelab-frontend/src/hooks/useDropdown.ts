import { useEffect, useRef, useState } from 'react'

/**
 * 헤더에서 버튼 아래로 열리는 판(프로필 메뉴·알림)의 여닫기.
 *
 * 바깥을 누르면 닫고 Esc 로도 닫는 처리는 어느 드롭다운에나 똑같이 필요한데, 각자
 * 들고 있으면 한쪽만 고쳐지고 다른 쪽은 그대로 남는다. 특히 Esc 로 닫았을 때 포커스를
 * 열었던 버튼으로 돌려주는 건 빠뜨리기 쉽다.
 *
 * 헤더에 드롭다운이 둘 이상 있어도 동시에 열리지는 않는다 — 다른 트리거를 누르는 것은
 * 지금 열려 있는 쪽에서 보면 "바깥 누름"이라 그쪽이 먼저 닫히고 나서 열린다.
 */
export function useDropdown() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      // 키보드로 닫았으면 포커스가 사라지면 안 된다 — 열었던 자리로 돌려준다
      buttonRef.current?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return { open, setOpen, containerRef, buttonRef }
}
