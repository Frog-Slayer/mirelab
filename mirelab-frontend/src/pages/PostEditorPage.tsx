import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'
import PersonalBlockNoteField from '@/components/PersonalBlockNoteField'
import { useCurrentUser } from '@/hooks/currentUser'
import { deletePost, getPost, updatePost } from '@/lib/postApi'
import { getMyStudies } from '@/lib/studyApi'
import type { BlockDocument, Post } from '@/types'

interface Draft {
  title: string
  bodyJson: string | null
  workId: string | null
  sharedStudyIds: string[]
  published: boolean
}

export default function PostEditorPage() {
  const { postId = '', studySlug = '' } = useParams()
  const username = studySlug.startsWith('@') ? studySlug.slice(1) : ''
  const { user } = useCurrentUser()
  const { data: post } = useQuery({ queryKey: ['post', postId], queryFn: () => getPost(postId) })
  if (!post || !user) return <p className="text-sm text-neutral-500">불러오는 중…</p>
  if (post.author.id !== user.id)
    return <p className="text-sm text-rose-700">작성자만 수정할 수 있습니다.</p>
  if (post.work?.ownerId === user.id && post.work.studyId === null) {
    return (
      <p className="text-sm text-neutral-500">개인 책에 연결된 글은 책장 상세에서 수정해 주세요.</p>
    )
  }
  return <Editor key={post.id} post={post} username={username} />
}

function Editor({ post, username }: { post: Post; username: string }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [draft, setDraft] = useState<Draft>({
    title: post.title,
    bodyJson: post.bodyJson,
    workId: post.work?.id ?? null,
    sharedStudyIds: post.sharedStudyIds,
    published: post.published,
  })
  const draftRef = useRef(draft)
  const queueRef = useRef(Promise.resolve<unknown>(post))
  const titleTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const persistRef = useRef<(snapshot?: Draft) => void>(() => undefined)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved')
  const { data: studies = [] } = useQuery({ queryKey: ['myStudies'], queryFn: getMyStudies })

  const change = (patch: Partial<Draft>, saveNow = false) => {
    const next = { ...draftRef.current, ...patch }
    draftRef.current = next
    setDraft(next)
    if (saveNow) persist(next)
  }
  const persist = (snapshot: Draft = draftRef.current) => {
    setSaveState('saving')
    queueRef.current = queueRef.current
      .catch(() => undefined)
      .then(() => updatePost({ id: post.id, ...snapshot }))
      .then(() => {
        setSaveState('saved')
        void qc.invalidateQueries({ queryKey: ['post', post.id] })
        void qc.invalidateQueries({ queryKey: ['userPosts'] })
      })
      .catch(() => setSaveState('error'))
  }
  persistRef.current = persist

  const changeTitle = (title: string) => {
    change({ title })
    clearTimeout(titleTimerRef.current)
    titleTimerRef.current = setTimeout(() => {
      titleTimerRef.current = undefined
      persist()
    }, 600)
  }
  useEffect(
    () => () => {
      if (titleTimerRef.current !== undefined) {
        clearTimeout(titleTimerRef.current)
        persistRef.current()
      }
    },
    [],
  )

  const remove = useMutation({
    mutationFn: () => deletePost(post.id),
    onSuccess: () => {
      void qc.invalidateQueries()
      navigate(`/@${username}`)
    },
  })
  const blocks = parseBlocks(draft.bodyJson)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3 border-b border-neutral-200 pb-4">
        <button
          type="button"
          onClick={() => navigate(`/@${username}/posts/${post.id}`)}
          className="text-sm text-neutral-500"
        >
          ← 읽기
        </button>
        <span className="ml-auto text-xs text-neutral-500">
          {saveState === 'saving' ? '저장 중…' : saveState === 'error' ? '저장 실패' : '저장됨'}
        </span>
        <button
          type="button"
          onClick={() => change({ published: !draft.published }, true)}
          disabled={!draft.published && !draft.title.trim()}
          className={`app-button disabled:cursor-not-allowed disabled:opacity-40 ${draft.published ? 'app-button-secondary' : 'app-button-primary'}`}
        >
          {draft.published ? '비공개로 전환' : '공개'}
        </button>
      </div>

      <input
        value={draft.title}
        onChange={(event) => changeTitle(event.target.value)}
        placeholder="제목"
        className="mt-8 w-full text-4xl font-semibold tracking-[-0.04em] outline-none placeholder:text-neutral-300"
      />

      <div className="app-card mt-6 p-4">
        <fieldset>
          <legend className="text-sm text-neutral-600">공개 대상</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {studies.map((study) => (
              <label key={study.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.sharedStudyIds.includes(study.id)}
                  onChange={(event) => {
                    const ids = event.target.checked
                      ? [...draft.sharedStudyIds, study.id]
                      : draft.sharedStudyIds.filter((id) => id !== study.id)
                    change({ sharedStudyIds: ids }, true)
                  }}
                />
                {study.name}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="mt-8 min-h-80">
        <PersonalBlockNoteField
          value={{ blocks }}
          onSave={(value: BlockDocument) =>
            change({ bodyJson: JSON.stringify(value.blocks) }, true)
          }
        />
      </div>

      <div className="mt-12 border-t border-neutral-200 pt-5 text-right">
        <button
          type="button"
          onClick={() => {
            if (window.confirm('이 글을 삭제할까요?')) remove.mutate()
          }}
          className="cursor-pointer text-sm text-rose-700"
        >
          글 삭제
        </button>
      </div>
    </div>
  )
}

function parseBlocks(bodyJson: string | null): unknown[] {
  if (!bodyJson) return []
  try {
    const value: unknown = JSON.parse(bodyJson)
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}
