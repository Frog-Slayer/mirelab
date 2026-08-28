import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { BookcaseItem } from '@/components/Bookcase'
import { kindBadgeClass, kindLabel } from '@/lib/workKind'

const BADGE_CLASS = 'inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-medium'

/** 표지 + 배지/제목/저자, 그 아래 footer(선정인·사유 또는 별점)로 채우는 작품 카드 */
export default function WorkCard({ item, footer }: { item: BookcaseItem; footer: ReactNode }) {
  return (
    <Link
      to={item.href}
      className="group flex gap-1.5 overflow-hidden rounded-lg border border-neutral-200 bg-white p-1.5 transition hover:border-emerald-300"
    >
      <div className="aspect-[2/3] w-[34%] flex-none overflow-hidden rounded-md bg-white">
        {item.coverUrl ? (
          // 표지는 원래 세로 책 비율이라 칸에 넣으면 잘리는데, 그대로 둔다.
          <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-100 p-1 text-center text-[9px] font-medium text-neutral-400">
            {item.title}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div className="flex flex-col gap-0.5">
          <span className={`${BADGE_CLASS} ${kindBadgeClass[item.kind]}`}>
            {kindLabel[item.kind]}
          </span>
          <h3 className="line-clamp-1 text-sm leading-snug font-semibold group-hover:underline">
            {item.title}
          </h3>
          {item.author && <p className="truncate text-xs text-neutral-500">{item.author}</p>}
        </div>
        {footer}
      </div>
    </Link>
  )
}
