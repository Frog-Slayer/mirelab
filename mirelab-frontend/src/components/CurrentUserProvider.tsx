import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CurrentUserContext, type CurrentUserValue } from '@/hooks/currentUser'
import { getUsers } from '@/mocks/api'

const STORAGE_KEY = 'mirelab.userId'

// 샌드박스된 iframe 에서는 localStorage 접근이 막혀 있을 수 있다 (데모 페이지)
function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export default function CurrentUserProvider({ children }: { children: ReactNode }) {
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers })
  const [userId, setUserId] = useState<string | null>(readStored)

  useEffect(() => {
    if (!userId) return
    try {
      localStorage.setItem(STORAGE_KEY, userId)
    } catch {
      // 저장 못 해도 이번 세션 동안은 동작한다
    }
  }, [userId])

  const value = useMemo<CurrentUserValue>(() => {
    const user = users.find((u) => u.id === userId) ?? users[0] ?? null
    return { users, user, setUserId }
  }, [users, userId])

  return <CurrentUserContext value={value}>{children}</CurrentUserContext>
}
