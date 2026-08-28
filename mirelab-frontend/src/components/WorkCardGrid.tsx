import type { ReactNode } from 'react'
import type { BookcaseItem } from '@/components/Bookcase'
import WorkCard from '@/components/WorkCard'

export default function WorkCardGrid({
  items,
  footer,
}: {
  items: BookcaseItem[]
  footer: (item: BookcaseItem) => ReactNode
}) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {items.map((item) => (
        <WorkCard key={item.id} item={item} footer={footer(item)} />
      ))}
    </div>
  )
}
