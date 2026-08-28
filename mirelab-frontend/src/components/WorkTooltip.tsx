import Cover from '@/components/Cover'
import PickNote from '@/components/PickNote'
import Stars from '@/components/Stars'
import type { BookcaseItem } from '@/components/Bookcase'
import { formatRating } from '@/lib/format'
import type { User } from '@/types'

/**
 * 표지에 마우스를 올렸을 때 위로 뜨는 설명 카드. 책장(Bookcase)의 호버 카드와 같은 모양이다.
 *
 * 보이고 숨는 건 부모의 `group` 에 달려 있으므로, 쓰는 쪽 요소에 `group relative` 를 함께
 * 걸어야 한다. 그리고 그 요소에 `overflow-hidden` 이 있으면 카드가 잘려 보이지 않는다 —
 * 카드는 부모 바깥(위쪽)에 그려지기 때문이다.
 *
 * 터치 기기에는 호버가 없으므로 [useLongPressPreview] 로 길게 누른 상태를 받아 `open` 으로
 * 넘긴다.
 */
export default function WorkTooltip({
  item,
  users,
  open = false,
}: {
  item: BookcaseItem
  users: User[]
  /** 터치에서 길게 눌러 연 상태 */
  open?: boolean
}) {
  return (
    <div
      className={`pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-72 -translate-x-1/2 transition-opacity duration-150 ${
        open
          ? 'visible opacity-100'
          : 'invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100'
      }`}
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
    </div>
  )
}
