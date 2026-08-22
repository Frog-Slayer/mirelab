import { Library, LogOut, Settings, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import Avatar from '@/components/Avatar'
import {
  MENU_ICON_CLASS,
  MENU_ITEM_CLASS,
  MENU_PANEL_CLASS,
  MENU_TRIGGER_CLASS,
} from '@/components/layout/menu'
import { useCurrentUser } from '@/hooks/currentUser'
import { useDropdown } from '@/hooks/useDropdown'
import type { User } from '@/types'

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
  // "멤버 관리"는 shelfTo 처럼 prop 으로 받지 않는다 — 갈 곳이 스터디에 따라 달라지는
  // 서재와 달리 경로가 하나로 고정이고, admin 여부는 여기서 바로 알 수 있다.
  const { logout, isAdmin } = useCurrentUser()
  const navigate = useNavigate()
  const { open, setOpen, containerRef, buttonRef } = useDropdown()

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${user.name} 메뉴`}
        className={MENU_TRIGGER_CLASS}
      >
        <Avatar user={user} />
      </button>

      {open && (
        <div role="menu" className={`${MENU_PANEL_CLASS} w-44`}>
          <p className="truncate px-3 py-2 text-sm font-medium text-neutral-900">{user.name}</p>
          <div className="my-1 border-t border-neutral-100" />

          {shelfTo && (
            <Link
              to={shelfTo}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={MENU_ITEM_CLASS}
            >
              <Library aria-hidden className={MENU_ICON_CLASS} strokeWidth={1.75} />내 서재
            </Link>
          )}
          <Link
            to="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={MENU_ITEM_CLASS}
          >
            <Settings aria-hidden className={MENU_ICON_CLASS} strokeWidth={1.75} />
            설정
          </Link>
          {isAdmin && (
            <Link
              to="/admin/members"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={MENU_ITEM_CLASS}
            >
              <Users aria-hidden className={MENU_ICON_CLASS} strokeWidth={1.75} />
              멤버 관리
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              void logout().then(() => navigate('/'))
            }}
            className={MENU_ITEM_CLASS}
          >
            <LogOut aria-hidden className={MENU_ICON_CLASS} strokeWidth={1.75} />
            로그아웃
          </button>
        </div>
      )}
    </div>
  )
}
