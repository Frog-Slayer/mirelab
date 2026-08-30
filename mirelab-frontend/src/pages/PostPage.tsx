import { useQuery } from '@tanstack/react-query'
import { useCreateBlockNote } from '@blocknote/react'
import type { PartialBlock } from '@blocknote/core'
import { BlockNoteView } from '@blocknote/shadcn'
import { Link, useParams } from 'react-router'
import '@blocknote/shadcn/style.css'
import Cover from '@/components/Cover'
import { useCurrentUser } from '@/hooks/currentUser'
import { getPost } from '@/lib/postApi'
import { READING_STUDY_SLUG } from '@/lib/studyApi'
import { WorkKind } from '@/types'

export default function PostPage() {
  const { postId = '', studySlug = '' } = useParams()
  const username = studySlug.startsWith('@') ? studySlug.slice(1) : ''
  const { user } = useCurrentUser()
  const { data: post } = useQuery({ queryKey: ['post', postId], queryFn: () => getPost(postId) })
  const own = !!post && user?.id === post.author.id
  if (!post) return <p className="text-sm text-neutral-500">불러오는 중…</p>
  const shelfEditHref = post.work ? `/${READING_STUDY_SLUG}/shelf/${post.work.id}` : null
  return (
    <article className="mx-auto max-w-3xl">
      <Link to={`/@${username}`} className="text-sm text-neutral-500 hover:text-neutral-900">
        ← 글 목록
      </Link>
      {post.work ? (
        <header className="app-card mt-8 flex gap-6 p-6 sm:p-8">
          <div className="w-36 flex-none sm:w-44">
            <Cover work={post.work} size="lg" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <div>
                <p className="text-xs font-medium text-neutral-500">
                  {post.work.kind === WorkKind.MOVIE ? 'Movie' : 'Book'}
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">{post.work.title}</h1>
              </div>
              {own && shelfEditHref && (
                <Link
                  to={shelfEditHref}
                  className="ml-auto text-sm text-neutral-500 hover:text-neutral-900"
                >
                  책장에서 수정
                </Link>
              )}
            </div>
            <p className="mt-2 text-sm text-neutral-500">
              {post.work.author} · {post.work.year}
            </p>
            {post.work.description && (
              <p className="mt-4 text-sm leading-relaxed text-neutral-600">
                {post.work.description}
              </p>
            )}
            <p className="mt-4 text-xs text-neutral-500">{post.author.name}의 기록</p>
          </div>
        </header>
      ) : (
        <div className="mt-8 border-b border-neutral-200 pb-6">
          <div className="flex items-start gap-3">
            <h1 className="text-4xl font-semibold tracking-[-0.04em]">
              {post.title || '제목 없음'}
            </h1>
            {own && (
              <Link
                to={`/@${username}/posts/${post.id}/edit`}
                className="ml-auto text-sm text-neutral-500"
              >
                수정
              </Link>
            )}
          </div>
          <p className="mt-3 text-sm text-neutral-500">{post.author.name}</p>
        </div>
      )}
      {post.work && (
        <div className="mt-10 border-b border-neutral-200 pb-5">
          <h2 className="text-3xl font-semibold tracking-tight">{post.title}</h2>
        </div>
      )}
      <ReadonlyBody bodyJson={post.bodyJson} />
    </article>
  )
}

function ReadonlyBody({ bodyJson }: { bodyJson: string | null }) {
  const blocks = parseBlocks(bodyJson)
  const editor = useCreateBlockNote({ initialContent: blocks?.length ? blocks : undefined })
  return (
    <div className="mt-8">
      <BlockNoteView editor={editor} editable={false} theme="light" />
    </div>
  )
}

function parseBlocks(bodyJson: string | null): PartialBlock[] | undefined {
  if (!bodyJson) return undefined
  try {
    const value: unknown = JSON.parse(bodyJson)
    return Array.isArray(value) ? (value as PartialBlock[]) : undefined
  } catch {
    return undefined
  }
}
