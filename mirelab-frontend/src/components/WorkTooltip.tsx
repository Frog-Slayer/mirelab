import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import Cover from '@/components/Cover'
import PickNote from '@/components/PickNote'
import Stars from '@/components/Stars'
import type { BookcaseItem } from '@/components/Bookcase'
import { formatRating } from '@/lib/format'
import type { User } from '@/types'

/** 카드와 화면 가장자리·헤더 사이에 남겨둘 여백 */
const MARGIN = 8
const WIDTH = 288

/**
 * 표지에 마우스를 올렸을 때(터치에서는 길게 눌렀을 때) 뜨는 설명 카드.
 *
 * 화면 좌표(fixed)로 body 에 직접 그린다 — 카드 안에 두면 그리드 칸 밖으로 나가는 순간
 * 조상의 overflow 나 z-index 에 걸려 잘리고, 표지가 화면 끝이나 헤더에 가까울 때 잘린 채
 * 뜬다. 위치는 열릴 때마다 재서 화면 안으로 밀어 넣는다.
 */
export default function WorkTooltip({
  item,
  users,
  anchor,
  open,
}: {
  item: BookcaseItem
  users: User[]
  /** 이 요소를 기준으로 위치를 잡는다 — [useLongPressPreview] 가 잡아준다 */
  anchor: HTMLElement | null
  open: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  // 재기 전에는 화면 밖에 둔다 — 가운데 어딘가에 한 번 떴다가 제자리로 튀는 걸 막는다.
  const [style, setStyle] = useState<CSSProperties>({ top: -9999, left: -9999 })

  useLayoutEffect(() => {
    if (!open || !anchor) return

    const place = () => {
      const tooltip = ref.current
      if (!tooltip) return

      const from = anchor.getBoundingClientRect()
      const size = tooltip.getBoundingClientRect()

      // 표지 가운데에 맞추되, 양옆이 화면을 넘으면 넘은 만큼 안으로 민다.
      const centered = from.left + from.width / 2 - size.width / 2
      const left = Math.max(
        MARGIN,
        Math.min(centered, window.innerWidth - size.width - MARGIN),
      )

      // 기본은 표지 위. 헤더(스크롤해도 붙어 있다)에 닿을 만큼 위가 좁으면 아래로 뒤집는다.
      const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0
      const above = from.top - size.height - MARGIN
      const top = above < headerBottom + MARGIN ? from.bottom + MARGIN : above

      setStyle({ top, left })
    }

    place()

    // 뜬 채로 스크롤하거나 창 크기가 바뀌면 기준이 어긋난다. 열려 있는 동안만 듣는다.
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, anchor])

  if (!open || !anchor) return null

  return createPortal(
    <div
      ref={ref}
      style={{ ...style, width: WIDTH }}
      className="pointer-events-none fixed z-50 transition-opacity duration-150"
    >
      <div className="flex items-center gap-5 rounded-lg border border-neutral-200 bg-white p-4 text-left shadow-lg">
        <div className="w-10 flex-none">
          <Cover work={item} size="sm" />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-sm font-semibold text-neutral-900">{item.title}</span>
          <span className="text-xs text-neutral-500">
            {item.author} · {item.year}
          </span>
          {!!item.voterCount && (
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold tabular-nums text-neutral-900">
                {formatRating(item.average ?? 0)}
              </span>
              <Stars value={item.average ?? 0} size="sm" />
            </div>
          )}
          {item.description && (
            <p className="line-clamp-2 text-xs text-neutral-600">{item.description}</p>
          )}
          <PickNote addedBy={item.addedBy} reason={item.reason} users={users} truncate={false} />
        </div>
      </div>
    </div>,
    document.body,
  )
}
