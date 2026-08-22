import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CurrentUserContext, type AuthStatus, type CurrentUserValue } from '@/hooks/currentUser'
import { setAuthLostHandler } from '@/lib/api'
import { logout as logoutRequest, refreshSession } from '@/lib/authApi'
import { Role, type User } from '@/types'

export default function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const queryClient = useQueryClient()

  // StrictMode 는 effect 를 두 번 돌린다. 갱신은 refresh 토큰을 회전시키므로
  // 두 번 나가면 두 번째가 이미 무효가 된 값을 들고 가 멀쩡한 세션을 끊는다.
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    refreshSession()
      .then((res) => {
        setUser(res.user)
        setStatus('authenticated')
      })
      .catch(() => {
        // 쿠키가 없거나 죽은 것 — 로그인 화면으로 보내면 된다. 오류로 취급할 일이 아니다.
        setUser(null)
        setStatus('anonymous')
      })
  }, [])

  // 갱신까지 실패해 세션이 끊겼을 때(토큰 만료 후 오래 방치 등) 화면을 되돌린다
  useEffect(() => {
    setAuthLostHandler(() => {
      setUser(null)
      setStatus('anonymous')
      queryClient.clear()
    })
    return () => setAuthLostHandler(null)
  }, [queryClient])

  const logout = useCallback(async () => {
    await logoutRequest()
    setUser(null)
    setStatus('anonymous')
    // 남의 계정으로 다시 로그인했을 때 이전 사람의 응답이 보이면 안 된다
    queryClient.clear()
  }, [queryClient])

  const applyUser = useCallback((next: User) => setUser(next), [])

  const value = useMemo<CurrentUserValue>(
    () => ({ user, status, isAdmin: user?.role === Role.ADMIN, logout, applyUser }),
    [user, status, logout, applyUser],
  )

  return <CurrentUserContext value={value}>{children}</CurrentUserContext>
}
