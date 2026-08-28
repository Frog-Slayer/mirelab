import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { BookcaseItem } from '@/components/Bookcase'
import KindTag from '@/components/KindTag'
import WorkTooltip from '@/components/WorkTooltip'
import { useLongPressPreview } from '@/hooks/useLongPressPreview'
import type { User } from '@/types'

/** 표지 + 배지/제목/저자, 그 아래 footer(선정인·사유 또는 별점)로 채우는 작품 카드 */
export default function WorkCard({
  item,
  footer,
  users,
}: {
  item: BookcaseItem
  footer: ReactNode
  /** 주면 호버할 때 설명 카드를 띄운다 */
  users?: User[]
}) {
  const longPress = useLongPressPreview()

  return (
    <Link
      to={item.href}
      {...(users ? longPress.handlers : {})}
      className="app-tile group flex gap-2 overflow-hidden p-2 hover:ring-emerald-400/60"
    >
      <div className="aspect-[2/3] w-[34%] flex-none overflow-hidden rounded-md bg-white">
        {item.coverUrl ? (
          // 표지는 원래 세로 책 비율이라 칸에 넣으면 잘리는데, 그대로 둔다.
          <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-100 p-1 text-center text-[9px] font-medium text-neutral-500">
            {item.title}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div className="flex flex-col gap-0.5">
          <KindTag kind={item.kind} />
          <h3 className="line-clamp-1 text-sm leading-snug font-semibold group-hover:underline">
            {item.title}
          </h3>
          {item.author && <p className="truncate text-xs text-neutral-500">{item.author}</p>}
        </div>
        {footer}
      </div>

      {users && (
        <WorkTooltip item={item} users={users} anchor={longPress.anchor} open={longPress.open} />
      )}
    </Link>
  )
}
