import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import Avatar from '@/components/Avatar'
import { useCurrentUser } from '@/hooks/currentUser'
import type { User } from '@/types'

/**
 * 메뉴 항목 하나의 생김새. Link 든 button 이든 똑같이 보이도록 한 곳에 모아둔다 —
 * 각자 클래스를 늘어놓으면 하나를 고칠 때 나머지가 조용히 어긋난다.
 */
const ITEM_CLASS =
  'block w-full cursor-pointer px-3 py-2 text-left text-sm font-normal text-neutral-700 hover:bg-neutral-50'

/**
 * 헤더 우상단의 프로필 사진과 그 아래로 열리는 메뉴.
 *
 * 로그아웃을 여기 넣은 이유: 헤더에 상시 노출돼 있으면 매일 쓰는 버튼들 사이에서 실수로
 * 눌리기 쉽고, 자리도 그만큼 차지한다. 자주 쓰지 않는 것은 한 번 열어야 보이는 편이 낫다.
 *
 * "내 서재" 도 같은 이유로 여기 있다 — 스터디 탭(홈·작품 목록·일정)은 다 같이 보는 것이고
 * 서재는 내 것이라, 축이 다른 것을 같은 줄에 세워두지 않는다. 서재 화면은 스터디 안에
 * 있으므로([routes] 의 `:studySlug/shelf`) 갈 곳이 정해질 때만 [shelfTo] 가 들어온다.
 */
export default function UserMenu({ user, shelfTo }: { user: User; shelfTo?: string | null }) {
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

          {shelfTo && (
            <Link to={shelfTo} role="menuitem" onClick={() => setOpen(false)} className={ITEM_CLASS}>
              내 서재
            </Link>
          )}
          <Link to="/settings" role="menuitem" onClick={() => setOpen(false)} className={ITEM_CLASS}>
            설정
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              void logout().then(() => navigate('/'))
            }}
            className={ITEM_CLASS}
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  )
}
