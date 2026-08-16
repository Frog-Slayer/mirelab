import { createContext, use } from 'react'
import type { User } from '@/types'

// 로그인은 나중에 붙인다. 그때 CurrentUserProvider 안쪽만 실제 인증 결과로 교체하면
// 이 훅을 쓰는 나머지 코드는 건드리지 않아도 된다.

export interface CurrentUserValue {
  users: User[]
  user: User | null
  setUserId: (id: string) => void
}

export const CurrentUserContext = createContext<CurrentUserValue | null>(null)

export function useCurrentUser() {
  const ctx = use(CurrentUserContext)
  if (!ctx) throw new Error('CurrentUserProvider 안에서만 쓸 수 있습니다')
  return ctx
}
