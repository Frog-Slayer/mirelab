import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Cover from '@/components/Cover'
import { useCurrentUser } from '@/hooks/currentUser'
import { useStudy } from '@/hooks/useStudy'
import { addSession, addWork, getLibrary, searchBooks, type BookHit } from '@/mocks/api'
import { WorkKind, WorkStatus } from '@/types'

type Picked = { kind: 'existing'; workId: string } | { kind: 'new'; book: BookHit } | null

export default function SessionFormPage() {
  const { user } = useCurrentUser()
  const { study } = useStudy()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [picked, setPicked] = useState<Picked>(null)
  const [meetAt, setMeetAt] = useState('')
  const [undecided, setUndecided] = useState(true)

  const { data: library = [] } = useQuery({
    queryKey: ['library', study?.id],
    queryFn: () => getLibrary(study!.id),
    enabled: !!study,
  })

  const create = useMutation({
    mutationFn: async () => {
      let workId: string | undefined
      if (picked?.kind === 'existing') {
        workId = picked.workId
      } else if (picked?.kind === 'new') {
        const created = await addWork({
          studyId: study!.id,
          kind: WorkKind.BOOK,
          title: picked.book.title,
          author: picked.book.author,
          addedBy: user!.id,
        })
        workId = created.id
      }
      return addSession({
        studyId: study!.id,
        workId,
        meetAt: undecided || !meetAt ? null : meetAt,
      })
    },
    onSuccess: (session) => {
      qc.invalidateQueries()
      navigate(`/${study!.slug}/w/${session.id}`)
    },
  })

  if (!study || !user) return null

  const ongoing = library.filter((w) => w.status !== WorkStatus.DONE)
  const canSubmit = !create.isPending

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">새 모임</h1>
        <p className="text-sm text-neutral-500">
          정해진 주기가 없으니 날짜는 나중에 정해도 됩니다. 책만 있으면 시작할 수 있습니다.
        </p>
      </div>

      {/* 1. 무엇을 다루나 */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-700">무엇을 읽나</h2>

        {ongoing.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs text-neutral-500">작품에 있는 것</span>
            <div className="flex flex-wrap gap-2">
              {ongoing.map((w) => {
                const on = picked?.kind === 'existing' && picked.workId === w.id
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setPicked({ kind: 'existing', workId: w.id })}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      on
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm'
                        : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    <Cover work={w} size="sm" />
                    <span className="flex flex-col items-start">
                      <span>{w.title}</span>
                      <span className="text-xs text-neutral-500">
                        {w.status === WorkStatus.READING ? '읽는 중' : '후보'}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <BookSearch
          selected={picked?.kind === 'new' ? picked.book : null}
          onPick={(book) => setPicked({ kind: 'new', book })}
        />

        <p className="text-xs text-neutral-500">
          아무것도 안 고르면 작품 없이 모임만 만듭니다. 나중에 붙일 수 있습니다.
        </p>
      </section>

      {/* 2. 날짜 */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-700">모임 일시</h2>

        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="radio" checked={undecided} onChange={() => setUndecided(true)} />
            아직 미정 — 나중에 일정 탭에서 조율
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="radio" checked={!undecided} onChange={() => setUndecided(false)} />
            지금 정하기
          </label>
          {!undecided && (
            <input
              type="datetime-local"
              value={meetAt}
              onChange={(e) => setMeetAt(e.target.value)}
              className="self-start rounded-sm border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          )}
        </div>
      </section>

      <div className="flex items-center gap-3 border-t border-neutral-200 pt-6">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => create.mutate()}
          className="app-button app-button-primary"
        >
          {create.isPending ? '만드는 중…' : '만들기'}
        </button>
        <Link to={`/${study.slug}/sessions`} className="text-sm text-neutral-500 hover:underline">
          취소
        </Link>
      </div>
    </div>
  )
}

function BookSearch({
  selected,
  onPick,
}: {
  selected: BookHit | null
  onPick: (book: BookHit) => void
}) {
  const [query, setQuery] = useState('')

  const { data: hits = [], isFetching } = useQuery({
    queryKey: ['bookSearch', query],
    queryFn: () => searchBooks(query),
    enabled: query.trim().length > 0,
  })

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-neutral-500">새로 찾기</span>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="제목이나 저자로 검색"
        className="rounded-sm border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
      />

      {isFetching && <span className="text-xs text-neutral-400">찾는 중…</span>}
      {!isFetching && query.trim() && hits.length === 0 && (
        <span className="text-xs text-neutral-400">결과가 없습니다.</span>
      )}

      <div className="flex flex-col gap-1.5">
        {hits.map((book) => {
          const on = selected?.title === book.title
          return (
            <button
              key={book.title}
              type="button"
              onClick={() => onPick(book)}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                on
                  ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                  : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              <Cover work={{ title: book.title, kind: WorkKind.BOOK }} size="sm" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{book.title}</span>
                <span className="truncate text-xs text-neutral-500">
                  {book.author} · {book.publisher} · {book.year} · {book.pages}쪽
                </span>
              </span>
              {on && <span className="text-xs text-emerald-700">선택됨</span>}
            </button>
          )
        })}
      </div>

      <p className="text-xs text-neutral-400">
        지금은 목 카탈로그입니다. 나중에 알라딘 OpenAPI 로 바뀌면 표지도 함께 들어옵니다.
      </p>
    </div>
  )
}
