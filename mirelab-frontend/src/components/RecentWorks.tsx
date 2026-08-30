import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import PickNote from '@/components/PickNote'
import WorkCardGrid from '@/components/WorkCardGrid'
import type { BookcaseItem } from '@/components/Bookcase'
import type { User } from '@/types'
import { WorkStatus } from '@/types'

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
    <section className="flex flex-col gap-5">
      {/* 제목 아래 가로선은 두지 않는다 — 섹션 사이 여백이 이미 경계 역할을 한다 */}
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight">최근 추가된 작품</h2>
        {/* 여기 있는 건 모두 후보라, 더보기도 후보만 걸린 목록으로 이어져야 말이 맞는다 */}
        <Link to={`/${studySlug}/books?status=${WorkStatus.CANDIDATE}`} className="app-pill">
          더보기
          <ArrowRight aria-hidden className="size-4" strokeWidth={2} />
        </Link>
      </div>

      <WorkCardGrid
        items={items}
        users={users}
        footer={(item) => (
          <PickNote addedBy={item.addedBy} reason={item.reason} users={users} stacked />
        )}
      />
    </section>
  )
}
