import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, NavLink, useNavigate, useParams } from 'react-router'
import Avatar from '@/components/Avatar'
import { useCurrentUser } from '@/hooks/currentUser'
import { getBlogProfile, getUserPosts, createPost } from '@/lib/postApi'
import { addPersonalWork, getUserShelf } from '@/lib/shelfApi'
import { getMyStudies } from '@/lib/studyApi'
import { AddDialog, ShelfContents } from '@/pages/ShelfPage'

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
  const { data: studies = [] } = useQuery({
    queryKey: ['myStudies', user?.id],
    queryFn: getMyStudies,
    enabled: !!user && own,
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

  if (!profile) return <p className="text-sm text-neutral-400">불러오는 중…</p>
  const base = `/@${profile.user.username}`

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-center gap-4 border-b border-neutral-200 pb-6">
        <Avatar user={profile.user} size="lg" />
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">{profile.user.name}</h1>
          <p className="mt-1 text-sm text-neutral-400">@{profile.user.username}</p>
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
          <div className="divide-y divide-neutral-100">
            {posts.map((post) => (
              <article key={post.id} className="py-5 first:pt-0">
                <Link to={`${base}/posts/${post.id}`} className="group block">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-medium group-hover:underline">{post.title || '제목 없음'}</h2>
                    {!post.published && (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">초안</span>
                    )}
                    {own && post.published && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                        공개 {post.sharedStudyIds.length}곳
                      </span>
                    )}
                  </div>
                  {post.excerpt && <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{post.excerpt}</p>}
                  <p className="mt-2 text-xs text-neutral-400">{formatDate(post.updatedAt)}</p>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-neutral-400">아직 보여줄 글이 없습니다.</p>
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
            currentStudySlug={studies[0]?.slug}
            onAdd={own ? () => setAddingBook(true) : undefined}
          />
        </>
      ) : (
        <p className="text-sm text-neutral-400">책장을 불러오는 중…</p>
      )}
    </div>
  )
}

function tabClass(active: boolean) {
  return `border-b-2 px-1 pb-3 ${active ? 'border-neutral-900 font-medium' : 'border-transparent text-neutral-500'}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value))
}
