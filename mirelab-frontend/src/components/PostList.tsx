import { Link } from 'react-router'
import Avatar from '@/components/Avatar'
import type { PostSummary } from '@/types'
import { WorkKind } from '@/types'

/** 여기서는 최근 글 미리보기만 — 전체 목록은 "더보기"로 이동해서 본다 */
const POST_LIST_LIMIT = 5

const workTagLabel: Record<WorkKind, string> = {
  [WorkKind.BOOK]: '독후감',
  [WorkKind.MOVIE]: '영화 감상',
  [WorkKind.GAME]: '게임 기록',
}

const workTagClass: Record<WorkKind, string> = {
  [WorkKind.BOOK]: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20',
  [WorkKind.MOVIE]: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
  [WorkKind.GAME]: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
}

export default function PostList({ posts }: { posts: PostSummary[] }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4 border-b border-neutral-200 pb-3">
        <h2 className="text-xl font-semibold tracking-[-0.03em]">최근 이야기</h2>
        <button
          type="button"
          onClick={() => window.alert('피드 모아둔 페이지로 갈 거임 ㅇㅇ')}
          className="shrink-0 cursor-pointer rounded-full border border-neutral-200 px-4 py-1.5 text-sm font-medium text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900"
        >
          더보기 +
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {posts.slice(0, POST_LIST_LIMIT).map((post) => (
          <Link
            key={post.id}
            to={`/@${post.author.username}/posts/${post.id}`}
            className="group flex overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:border-emerald-300"
          >
            {/* 너비 비율(30%)은 유지하고, 기존 4:3보다 높이만 약 50% 수준으로 낮춘다 */}
            <div className="relative aspect-[1/0.375] w-[30%] flex-none overflow-hidden bg-white">
              {post.work?.coverUrl ? (
                // 표지는 원래 세로 책 비율이라 가로로 긴 칸에 넣으면 잘리는데, 그대로 둔다.
                <img
                  src={post.work.coverUrl}
                  alt={post.work.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-neutral-100 p-3 text-center text-xs font-medium text-neutral-400">
                  {post.work?.title ?? (post.title || '제목 없음')}
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
              {post.work && (
                <span
                  className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${workTagClass[post.work.kind]}`}
                >
                  {workTagLabel[post.work.kind]}
                </span>
              )}
              <h3 className="line-clamp-1 text-base leading-snug font-semibold group-hover:underline">
                {post.title || '제목 없음'}
              </h3>
              <p className="line-clamp-2 text-sm leading-relaxed text-neutral-600">
                {post.excerpt || '본문을 읽어보세요.'}
              </p>
              <div className="mt-auto flex items-center gap-2">
                <Avatar user={post.author} size="sm" />
                <span className="text-xs font-medium text-neutral-700">{post.author.name}</span>
                <time
                  className="text-xs text-neutral-400"
                  dateTime={post.publishedAt ?? post.updatedAt}
                >
                  · {formatDate(post.publishedAt ?? post.updatedAt)}
                </time>
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
