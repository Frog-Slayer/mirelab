import type { ReactNode } from 'react'
import type { BookcaseItem } from '@/components/Bookcase'
import WorkCard from '@/components/WorkCard'
import type { User } from '@/types'

export default function WorkCardGrid({
  items,
  footer,
  users,
}: {
  items: BookcaseItem[]
  footer: (item: BookcaseItem) => ReactNode
  /** 주면 카드에 호버 설명 카드가 붙는다 */
  users?: User[]
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <WorkCard key={item.id} item={item} footer={footer(item)} users={users} />
      ))}
    </div>
  )
}
