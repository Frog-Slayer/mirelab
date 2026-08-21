import { api } from '@/lib/api'

export interface BookSearchResult {
  title: string
  author: string
  publisher: string
  pubDate: string
  isbn13: string
  cover: string
  description: string
}

export function searchBooks(query: string): Promise<BookSearchResult[]> {
  return api.get(`/books/search?query=${encodeURIComponent(query)}`)
}

/** 알라딘 pubDate("2015-11-24" 형식)에서 출간연도만 뽑는다. 못 읽으면 undefined */
export function parseYearFromPubDate(pubDate: string): number | undefined {
  const year = Number(pubDate.slice(0, 4))
  return Number.isFinite(year) && year > 0 ? year : undefined
}
