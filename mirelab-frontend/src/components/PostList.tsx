import { Link } from 'react-router'
import Avatar from '@/components/Avatar'
import Cover from '@/components/Cover'
import type { PostSummary } from '@/types'

/** 여기서는 최근 글 미리보기만 — 전체 목록은 "더보기"로 이동해서 본다 */
const POST_LIST_LIMIT = 5

export default function PostList({ posts }: { posts: PostSummary[] }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4 border-b border-neutral-200 pb-3">
        <h2 className="text-xl font-semibold tracking-[-0.03em]">멤버들의 글</h2>
        <button
          type="button"
          onClick={() => window.alert('피드 모아둔 페이지로 갈 거임 ㅇㅇ')}
          className="shrink-0 cursor-pointer text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          더보기
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {posts.slice(0, POST_LIST_LIMIT).map((post) => (
          <Link
            key={post.id}
            to={`/@${post.author.username}/posts/${post.id}`}
            className="group flex flex-col rounded-lg border border-neutral-200 bg-white p-3.5 transition hover:border-emerald-300"
          >
            <div className="flex items-center gap-2">
              <Avatar user={post.author} size="sm" />
              <span className="text-xs font-medium text-neutral-700">{post.author.name}</span>
              <time
                className="ml-auto text-xs text-neutral-400"
                dateTime={post.publishedAt ?? post.updatedAt}
              >
                {formatDate(post.publishedAt ?? post.updatedAt)}
              </time>
            </div>
            <div className="mt-2 flex gap-3">
              {post.work && (
                <div className="w-12 flex-none">
                  <Cover work={post.work} size="sm" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-1 text-base leading-snug font-semibold group-hover:underline">
                  {post.title || '제목 없음'}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-neutral-600">
                  {post.excerpt || '본문을 읽어보세요.'}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(new Date(value))
}
