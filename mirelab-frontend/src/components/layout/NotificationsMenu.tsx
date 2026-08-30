import { Bell, Construction } from 'lucide-react'
import { MENU_PANEL_CLASS, MENU_TRIGGER_CLASS } from '@/components/layout/menu'
import { useDropdown } from '@/hooks/useDropdown'

/**
 * 알림이 들어올 자리. 아직 알림 기능이 없어서 종만 걸어두고, 눌러보면 준비 중이라고
 * 알려준다.
 *
 * 기능도 없는데 미리 두는 이유: 알림이 생겼을 때 사람들이 찾을 자리를 지금 정해두면
 * 그때 헤더를 다시 짜지 않아도 되고, 프로필 사진 왼쪽의 빈 자리도 메워진다. 다만
 * 눌러서 아무 일도 안 일어나면 고장으로 보이므로 "아직 없다"를 분명히 말해준다.
 */
export default function NotificationsMenu() {
  const { open, setOpen, containerRef, buttonRef } = useDropdown()

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        // 메뉴 항목이 아니라 안내문 한 장이라 menu 가 아니라 dialog 로 알린다
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="알림"
        className={`${MENU_TRIGGER_CLASS} text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900`}
      >
        <Bell aria-hidden className="size-[18px]" strokeWidth={1.75} />
      </button>

      {open && (
        <div className={`${MENU_PANEL_CLASS} w-64`}>
          <div className="flex items-start gap-2.5 px-3 py-2">
            <Construction aria-hidden className="mt-0.5 size-4 flex-none text-amber-500" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-neutral-900">알림은 공사 중</p>
              <p className="text-xs leading-relaxed text-neutral-500">
                아직 만들지 않은 기능이에요. 나중에 새 소식이 여기로 들어옵니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
