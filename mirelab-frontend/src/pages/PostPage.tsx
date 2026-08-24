import { useQuery } from '@tanstack/react-query'
import { useCreateBlockNote } from '@blocknote/react'
import type { PartialBlock } from '@blocknote/core'
import { BlockNoteView } from '@blocknote/shadcn'
import { Link, useParams } from 'react-router'
import '@blocknote/shadcn/style.css'
import { useCurrentUser } from '@/hooks/currentUser'
import { getPost } from '@/lib/postApi'

export default function PostPage() {
  const { postId = '', studySlug = '' } = useParams()
  const username = studySlug.startsWith('@') ? studySlug.slice(1) : ''
  const { user } = useCurrentUser()
  const { data: post } = useQuery({ queryKey: ['post', postId], queryFn: () => getPost(postId) })
  if (!post) return <p className="text-sm text-neutral-400">불러오는 중…</p>
  return (
    <article className="mx-auto max-w-3xl">
      <Link to={`/@${username}`} className="text-sm text-neutral-500 hover:text-neutral-900">← 글 목록</Link>
      <div className="mt-8 border-b border-neutral-200 pb-6">
        <div className="flex items-start gap-3">
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">{post.title || '제목 없음'}</h1>
          {user?.id === post.author.id && (
            <Link to={`/@${username}/posts/${post.id}/edit`} className="ml-auto text-sm text-neutral-500">수정</Link>
          )}
        </div>
        <p className="mt-3 text-sm text-neutral-500">{post.author.name}</p>
      </div>
      <ReadonlyBody bodyJson={post.bodyJson} />
    </article>
  )
}

function ReadonlyBody({ bodyJson }: { bodyJson: string | null }) {
  const blocks = parseBlocks(bodyJson)
  const editor = useCreateBlockNote({ initialContent: blocks?.length ? blocks : undefined })
  return <div className="mt-8"><BlockNoteView editor={editor} editable={false} theme="light" /></div>
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
