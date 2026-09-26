import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, NavLink, useNavigate, useParams } from 'react-router'
import Avatar from '@/components/Avatar'
import KindTag from '@/components/KindTag'
import { useCurrentUser } from '@/hooks/currentUser'
import { getBlogProfile, getUserPosts, createPost } from '@/lib/postApi'
import { addPersonalWork, getUserShelf } from '@/lib/shelfApi'
import { READING_STUDY_SLUG } from '@/lib/studyApi'
import { AddDialog, ShelfContents } from '@/pages/ShelfPage'
import type { PostSummary } from '@/types'

export default function BlogPage({ tab }: { tab: 'posts' | 'books' }) {
  const { studySlug = '' } = useParams()
  const username = studySlug.startsWith('@') ? studySlug.slice(1) : ''
  const { user } = useCurrentUser()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [addingBook, setAddingBook] = useState(false)
  const own = user?.username === username
  const { data: profile } = useQuery({
    queryKey: ['blogProfile', username, user?.id],
    queryFn: () => getBlogProfile(username),
    enabled: !!user && !!username,
  })
  const { data: posts } = useQuery({
    queryKey: ['userPosts', username, user?.id],
    queryFn: () => getUserPosts(username),
    enabled: !!user && !!username && tab === 'posts',
  })
  const { data: shelf } = useQuery({
    queryKey: ['userShelf', username, user?.id],
    queryFn: () => getUserShelf(username),
    enabled: !!user && !!username && tab === 'books',
  })
  const create = useMutation({
    mutationFn: () => createPost(),
    onSuccess: (post) => navigate(`/@${username}/posts/${post.id}/edit`),
  })
  const addBook = useMutation({
    mutationFn: addPersonalWork,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['userShelf', username] })
      void qc.invalidateQueries({ queryKey: ['shelf'] })
      void qc.invalidateQueries({ queryKey: ['blogProfile', username] })
    },
  })

  if (!profile) return <p className="text-sm text-neutral-500">불러오는 중…</p>
  const base = `/@${profile.user.username}`

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-center gap-4 border-b border-neutral-200 pb-6">
        <Avatar user={profile.user} size="lg" />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{profile.user.name}</h1>
          <p className="mt-1 text-sm text-neutral-500">@{profile.user.username}</p>
          <p className="mt-2 text-sm text-neutral-500">
            글 {profile.postCount} · 책 {profile.bookCount}
          </p>
        </div>
        {own && tab === 'posts' && (
          <button
            type="button"
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="ml-auto cursor-pointer rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            새 글
          </button>
        )}
      </header>

      <nav className="flex gap-5 border-b border-neutral-200 text-sm">
        <NavLink to={base} end className={({ isActive }) => tabClass(isActive)}>
          글
        </NavLink>
        <NavLink to={`${base}/books`} className={({ isActive }) => tabClass(isActive)}>
          책장
        </NavLink>
      </nav>

      {tab === 'posts' ? (
        posts && posts.length > 0 ? (
          <PostCardList posts={posts} base={base} own={own} />
        ) : (
          <p className="py-12 text-center text-sm text-neutral-500">아직 보여줄 글이 없습니다.</p>
        )
      ) : shelf ? (
        <>
          {addingBook && (
            <AddDialog
              onClose={() => setAddingBook(false)}
              onSubmit={(input) => {
                addBook.mutate(input)
                setAddingBook(false)
              }}
            />
          )}
          <ShelfContents
            shelf={shelf}
            currentStudySlug={READING_STUDY_SLUG}
            onAdd={own ? () => setAddingBook(true) : undefined}
          />
        </>
      ) : (
        <p className="text-sm text-neutral-500">책장을 불러오는 중…</p>
      )}
    </div>
  )
}

/** 작품 목록과 같은 가로형 카드 목록. 왼쪽 칸에는 글에 연결된 작품의 표지를 쓴다. */
function PostCardList({
  posts,
  base,
  own,
}: {
  posts: PostSummary[]
  base: string
  own: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => (
        <Link
          key={post.id}
          to={`${base}/posts/${post.id}`}
          className="app-tile group flex overflow-hidden hover:ring-emerald-400/60"
        >
          <div className="aspect-[4/3] w-40 flex-none overflow-hidden bg-neutral-100 sm:w-52">
            {post.work?.coverUrl ? (
              <img
                src={post.work.coverUrl}
                alt={post.work.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs font-medium text-neutral-500">
                {post.work?.title || post.title || '제목 없음'}
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {post.work && <KindTag kind={post.work.kind} />}
              {!post.published ? (
                <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
                  초안
                </span>
              ) : (
                own && (
                  <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    공개 {post.sharedStudyIds.length}곳
                  </span>
                )
              )}
            </div>

            <h2 className="text-lg leading-snug font-semibold group-hover:underline">
              {post.title || '제목 없음'}
            </h2>

            {post.excerpt && (
              <p className="line-clamp-2 text-sm leading-relaxed text-neutral-500">
                {post.excerpt}
              </p>
            )}

            <time className="mt-auto pt-1 text-xs text-neutral-500" dateTime={post.updatedAt}>
              최근 수정 {formatDate(post.updatedAt)}
            </time>
          </div>
        </Link>
      ))}
    </div>
  )
}

function tabClass(active: boolean) {
  return `border-b-2 px-1 pb-3 ${active ? 'border-neutral-900 font-medium' : 'border-transparent text-neutral-500'}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value))
}
