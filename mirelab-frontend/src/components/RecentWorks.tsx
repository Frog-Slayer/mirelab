import { Link } from 'react-router'
import PickNote from '@/components/PickNote'
import WorkCardGrid from '@/components/WorkCardGrid'
import type { BookcaseItem } from '@/components/Bookcase'
import type { User } from '@/types'

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
          className="shrink-0 rounded-full border border-neutral-200 px-4 py-1.5 text-sm font-medium text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900"
        >
          더보기 +
        </Link>
      </div>

      <WorkCardGrid
        items={items}
        footer={(item) => (
          <PickNote addedBy={item.addedBy} reason={item.reason} users={users} stacked />
        )}
      />
    </section>
  )
}
