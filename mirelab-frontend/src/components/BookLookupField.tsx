import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchBooks, type BookSearchResult } from '@/lib/bookApi'
import { WorkKind } from '@/types'

/**
 * 제목을 입력하면 디바운스를 걸어 자동으로 알라딘에 검색을 보내 표지·줄거리 등 판본
 * 정보를 가져온다. 결과는 드롭다운이 아니라 큼직한 그리드로 펼쳐서 보여준다 — 실제로
 * 반영되는 건 사용자가 그중 하나를 클릭했을 때뿐이라, 타이핑 자체는 아무것도 안 지운다.
 * 이 컴포넌트에서 방금 판본을 골랐으면 그 뒤로 제목을 고쳐도 다시 검색하지 않는다 —
 * 표지를 지우거나 직접 고쳐야 다시 검색이 켜진다. (이미 등록된 작품을 수정할 때처럼
 * coverUrl 이 처음부터 채워져 있는 경우는 "방금 고른 것"이 아니라서 검색을 막지 않는다.)
 * 영화는 아직 검색 대상이 아니다.
 */
export default function BookLookupField({
  kind,
  title,
  coverUrl,
  onPick,
}: {
  kind: WorkKind
  title: string
  coverUrl: string
  onPick: (book: BookSearchResult) => void
}) {
  const [debouncedTitle, setDebouncedTitle] = useState('')
  const [lastPicked, setLastPicked] = useState<string | null>(null)
  // 표지가 없는 결과(book.cover === '')를 고른 경우까지 얼려버리면, coverUrl도 ''라
  // WorkPreviewCard의 지우기 버튼조차 안 뜨는 상태로 갇힌다 — 표지가 있을 때만 얼린다.
  const frozen = !!lastPicked && lastPicked === coverUrl

  useEffect(() => {
    if (frozen) return
    const t = setTimeout(() => setDebouncedTitle(title.trim()), 300)
    return () => clearTimeout(t)
  }, [title, frozen])

  const {
    data: suggestions = [],
    isFetching,
    isFetched,
  } = useQuery({
    queryKey: ['book-search', debouncedTitle],
    queryFn: () => searchBooks(debouncedTitle),
    enabled: kind === WorkKind.BOOK && !frozen && debouncedTitle.length >= 2,
  })

  if (kind !== WorkKind.BOOK || frozen || debouncedTitle.length < 2) return null

  return (
    <div className="flex flex-col gap-2">
      {isFetching && <p className="text-xs text-neutral-400">검색 중…</p>}
      {!isFetching && isFetched && suggestions.length === 0 && (
        <p className="text-xs text-neutral-400">검색 결과가 없습니다.</p>
      )}

      {suggestions.length > 0 && (
        <ul className="flex gap-3 overflow-x-auto overscroll-contain pb-1">
          {suggestions.map((book, index) => (
            <li key={book.isbn13 || `${book.title}-${index}`} className="flex-none">
              <button
                type="button"
                onClick={() => {
                  setLastPicked(book.cover)
                  onPick(book)
                }}
                className="flex max-w-28 flex-none cursor-pointer flex-col items-center gap-1.5 rounded-sm border border-transparent p-2 text-center hover:border-neutral-200 hover:bg-neutral-50"
              >
                {book.cover ? (
                  <img
                    src={book.cover.replace('/cover200/', '/cover500/')}
                    alt=""
                    className="h-32 w-auto flex-none rounded-sm shadow-sm"
                  />
                ) : (
                  <div className="flex h-32 w-22 flex-none items-center justify-center rounded-sm bg-neutral-100 text-xs text-neutral-400">
                    표지 없음
                  </div>
                )}
                <span className="line-clamp-2 text-xs font-medium">{book.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
