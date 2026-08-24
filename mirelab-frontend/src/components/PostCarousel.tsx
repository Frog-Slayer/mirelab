import { useRef } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import Avatar from '@/components/Avatar'
import type { PostSummary } from '@/types'

export default function PostCarousel({ posts }: { posts: PostSummary[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const move = (direction: -1 | 1) => {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({ left: direction * Math.max(280, track.clientWidth * 0.8), behavior: 'smooth' })
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">멤버들의 글</h2>
          <p className="mt-1 text-sm text-neutral-500">이 스터디에 공개된 글을 모아봅니다.</p>
        </div>
        <div className="flex gap-2">
          <CarouselButton label="이전 글" onClick={() => move(-1)}>
            <ChevronLeft aria-hidden className="size-4" />
          </CarouselButton>
          <CarouselButton label="다음 글" onClick={() => move(1)}>
            <ChevronRight aria-hidden className="size-4" />
          </CarouselButton>
        </div>
      </div>

      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {posts.map((post) => (
          <Link
            key={post.id}
            to={`/@${post.author.username}/posts/${post.id}`}
            className="group flex min-h-52 w-[min(22rem,85vw)] flex-none snap-start flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
          >
            <div className="flex items-center gap-2.5">
              <Avatar user={post.author} size="sm" />
              <span className="text-sm font-medium text-neutral-700">{post.author.name}</span>
              <time className="ml-auto text-xs text-neutral-400" dateTime={post.publishedAt ?? post.updatedAt}>
                {formatDate(post.publishedAt ?? post.updatedAt)}
              </time>
            </div>
            <h3 className="mt-5 line-clamp-2 text-lg leading-snug font-semibold group-hover:underline">
              {post.title || '제목 없음'}
            </h3>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-neutral-600">
              {post.excerpt || '본문을 읽어보세요.'}
            </p>
            {post.work && (
              <span className="mt-auto w-fit rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-500">
                {post.work.title}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}

function CarouselButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900"
    >
      {children}
    </button>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(new Date(value))
}
