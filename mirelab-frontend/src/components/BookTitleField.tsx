import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchBooks, type BookSearchResult } from '@/lib/bookApi'
import { WorkKind } from '@/types'

/** 제목 입력 + 알라딘 검색 자동완성. 영화는 아직 검색 대상이 아니다 */
export default function BookTitleField({
  kind,
  title,
  onChange,
  onPick,
}: {
  kind: WorkKind
  title: string
  onChange: (title: string) => void
  onPick: (book: BookSearchResult) => void
}) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [debouncedTitle, setDebouncedTitle] = useState('')
  // absolute 대신 fixed로 그려서, 이 필드가 <dialog>(모달) 안에 있어도
  // 모달의 overflow에 잘리지 않고 화면 기준으로 뜨게 한다.
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTitle(title.trim()), 300)
    return () => clearTimeout(t)
  }, [title])

  const { data: suggestions = [] } = useQuery({
    queryKey: ['book-search', debouncedTitle],
    queryFn: () => searchBooks(debouncedTitle),
    enabled: kind === WorkKind.BOOK && debouncedTitle.length >= 2 && showSuggestions,
  })

  useEffect(() => {
    if (!showSuggestions || suggestions.length === 0) return

    const updateRect = () => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) setDropdownRect({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
    updateRect()
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)
    return () => {
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
    }
  }, [showSuggestions, suggestions.length])

  return (
    <div ref={containerRef} className="relative min-w-40 flex-1">
      <input
        value={title}
        onChange={(e) => {
          onChange(e.target.value)
          setShowSuggestions(true)
        }}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        placeholder="제목"
        className="w-full rounded-sm border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
      />
      {showSuggestions && suggestions.length > 0 && dropdownRect && (
        <ul
          style={{ top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width }}
          className="fixed z-10 max-h-64 overflow-y-auto rounded-sm border border-neutral-200 bg-white shadow-md">
          {suggestions.map((book, index) => (
            <li key={book.isbn13 || `${book.title}-${index}`}>
              <button
                type="button"
                onClick={() => {
                  onPick(book)
                  setShowSuggestions(false)
                }}
                className="flex w-full cursor-pointer items-start gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-50"
              >
                {book.cover && (
                  <img
                    src={book.cover.replace('/cover200/', '/cover500/')}
                    alt=""
                    className="h-12 w-8 flex-none object-cover"
                  />
                )}
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{book.title}</span>
                  <span className="truncate text-xs text-neutral-500">{book.author}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
