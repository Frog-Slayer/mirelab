import { createContext, use } from 'react'
import type { User } from '@/types'

/** loading 은 첫 자동 로그인 시도가 끝나기 전 — 이때 리다이렉트하면 새로고침마다 로그인 화면이 번쩍인다 */
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface CurrentUserValue {
  user: User | null
  status: AuthStatus
  isAdmin: boolean
  logout: () => Promise<void>
}

export const CurrentUserContext = createContext<CurrentUserValue | null>(null)

export function useCurrentUser() {
  const ctx = use(CurrentUserContext)
  if (!ctx) throw new Error('CurrentUserProvider 안에서만 쓸 수 있습니다')
  return ctx
}
