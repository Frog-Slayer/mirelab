import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import Avatar from '@/components/Avatar'
import { useCurrentUser } from '@/hooks/currentUser'
import type { User } from '@/types'

/**
 * 헤더 우상단의 프로필 사진과 그 아래로 열리는 메뉴.
 *
 * 로그아웃을 여기 넣은 이유: 헤더에 상시 노출돼 있으면 매일 쓰는 버튼들 사이에서 실수로
 * 눌리기 쉽고, 자리도 그만큼 차지한다. 자주 쓰지 않는 것은 한 번 열어야 보이는 편이 낫다.
 */
export default function UserMenu({ user }: { user: User }) {
  const { logout } = useCurrentUser()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      // 키보드로 닫았으면 포커스가 사라지면 안 된다 — 열었던 자리로 돌려준다
      buttonRef.current?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${user.name} 메뉴`}
        className="block cursor-pointer rounded-full ring-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
      >
        <Avatar user={user} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-44 rounded-md border border-neutral-200 bg-white py-1 shadow-lg"
        >
          <p className="truncate px-3 py-2 text-sm font-medium text-neutral-900">{user.name}</p>
          <div className="my-1 border-t border-neutral-100" />

          <Link
            to="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            설정
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              void logout().then(() => navigate('/'))
            }}
            className="block w-full cursor-pointer px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  )
}
