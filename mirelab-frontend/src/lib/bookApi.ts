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
