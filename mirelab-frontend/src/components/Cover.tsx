import { useEffect, useState } from 'react'
import type { Work } from '@/types'
import { WorkKind } from '@/types'

interface Props {
  work: Pick<Work, 'title' | 'kind' | 'coverUrl'>
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const widths = { xxs: 'w-6', xs: 'w-9', sm: 'w-12', md: 'w-20', lg: 'w-full' }

/**
 * 알라딘이 공식적으로 주는 표지는 최대 200px(cover200)라 화질이 낮다. URL 경로의
 * cover200 을 cover500 으로 바꾸면 비공식이지만 500px 원본이 대부분 존재해서
 * 우선 시도하고, 없으면(드묾) onError 로 저장된 원래 URL로 되돌아간다.
 */
function upscale(url: string) {
  return url.replace('/cover200/', '/cover500/')
}

// 영화는 아직 TMDB 연동 전이라 coverUrl 이 없다 — 그동안은 자리만 잡아둔 placeholder를 보여준다.
export default function Cover({ work, size = 'md', className = '' }: Props) {
  const [src, setSrc] = useState(() => (work.coverUrl ? upscale(work.coverUrl) : undefined))

  useEffect(() => {
    setSrc(work.coverUrl ? upscale(work.coverUrl) : undefined)
  }, [work.coverUrl])

  if (src) {
    return (
      <img
        src={src}
        alt={work.title}
        onError={() => {
          if (work.coverUrl && src !== work.coverUrl) setSrc(work.coverUrl)
          else setSrc(undefined)
        }}
        className={`${widths[size]} aspect-2/3 flex-none rounded-md border border-neutral-200 object-cover ${className}`}
      />
    )
  }

  return (
    <div
      className={`${widths[size]} aspect-2/3 flex-none overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 ${className}`}
    >
      <div
        className={`flex h-full flex-col justify-between ${size === 'xxs' ? '' : size === 'xs' ? 'p-1' : 'p-2'}`}
      >
        {size !== 'xxs' && (
          <span
            className={`${size === 'xs' ? 'text-[9px]' : 'text-xs'} font-medium text-neutral-400`}
          >
            {work.kind === WorkKind.MOVIE ? '영화' : '책'}
          </span>
        )}
        {size !== 'xxs' && size !== 'xs' && size !== 'sm' && (
          <span className="line-clamp-4 text-xs leading-tight font-medium text-neutral-500">
            {work.title}
          </span>
        )}
      </div>
    </div>
  )
}
