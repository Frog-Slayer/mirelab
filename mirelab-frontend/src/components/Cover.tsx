import type { Work } from '@/types'
import { WorkKind } from '@/types'

interface Props {
  work: Pick<Work, 'title' | 'kind'>
  size?: 'sm' | 'md' | 'lg'
}

const widths = { sm: 'w-12', md: 'w-20', lg: 'w-full' }

// 표지는 나중에 알라딘 / TMDB 에서 받아온다. 지금은 자리만 잡아둔다.
export default function Cover({ work, size = 'md' }: Props) {
  return (
    <div
      className={`${widths[size]} aspect-2/3 flex-none overflow-hidden rounded-md border border-neutral-200 bg-neutral-100`}
    >
      <div className="flex h-full flex-col justify-between p-2">
        <span className="text-xs font-medium text-neutral-400">
          {work.kind === WorkKind.MOVIE ? '영화' : '책'}
        </span>
        {size !== 'sm' && (
          <span className="line-clamp-4 text-xs leading-tight font-medium text-neutral-500">
            {work.title}
          </span>
        )}
      </div>
    </div>
  )
}
