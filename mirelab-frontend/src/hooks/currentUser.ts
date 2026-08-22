import { createContext, use } from 'react'
import type { User } from '@/types'

/** loading 은 첫 자동 로그인 시도가 끝나기 전 — 이때 리다이렉트하면 새로고침마다 로그인 화면이 번쩍인다 */
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface CurrentUserValue {
  user: User | null
  status: AuthStatus
  isAdmin: boolean
  logout: () => Promise<void>
  /**
   * 설정에서 이름·사진을 고친 뒤 화면에 바로 반영한다. 서버가 돌려준 사용자를 그대로
   * 넣는다 — 프론트가 다음 상태를 지어내면 서버가 다듬은 값(공백 정리 등)과 어긋난다.
   */
  applyUser: (user: User) => void
}

export const CurrentUserContext = createContext<CurrentUserValue | null>(null)

export function useCurrentUser() {
  const ctx = use(CurrentUserContext)
  if (!ctx) throw new Error('CurrentUserProvider 안에서만 쓸 수 있습니다')
  return ctx
}
