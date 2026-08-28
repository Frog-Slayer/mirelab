import { Link } from 'react-router'
import PickNote from '@/components/PickNote'
import type { BookcaseItem } from '@/components/Bookcase'
import type { User } from '@/types'
import { WorkKind } from '@/types'

const kindLabel: Record<WorkKind, string> = {
  [WorkKind.BOOK]: '책',
  [WorkKind.MOVIE]: '영화',
}

const kindBadgeClass: Record<WorkKind, string> = {
  [WorkKind.BOOK]: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
  [WorkKind.MOVIE]: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
}

const BADGE_CLASS = 'inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-medium'

export default function RecentWorks({
  items,
  users,
  studySlug,
}: {
  items: BookcaseItem[]
  users: User[]
  studySlug: string
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4 border-b border-neutral-200 pb-3">
        <h2 className="text-xl font-semibold tracking-[-0.03em]">최근 추가된 작품</h2>
        <Link
          to={`/${studySlug}/books`}
          className="shrink-0 text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          더보기
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.id}
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
                {item.author && (
                  <p className="truncate text-xs text-neutral-500">{item.author}</p>
                )}
              </div>
              <PickNote addedBy={item.addedBy} reason={item.reason} users={users} stacked />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
