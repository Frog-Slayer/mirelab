/**
 * 헤더에서 열리는 판(프로필 메뉴·알림)의 공통 생김새.
 *
 * 나란히 붙어 있는 판들이라 테두리·그림자·모서리가 조금만 달라도 눈에 띈다. 폭은
 * 담기는 내용에 따라 다르므로 부르는 쪽이 정한다.
 */
export const MENU_PANEL_CLASS =
  'absolute right-0 z-20 mt-2 rounded-xl bg-white py-1.5 shadow-xl ring-1 ring-neutral-950/[0.08]'

/**
 * 메뉴 항목 하나의 생김새. Link 든 button 이든 똑같이 보이도록 한 곳에 모아둔다 —
 * 각자 클래스를 늘어놓으면 하나를 고칠 때 나머지가 조용히 어긋난다.
 */
export const MENU_ITEM_CLASS =
  'flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm font-normal text-neutral-700 hover:bg-neutral-50'

/**
 * 항목 앞 아이콘. 글자보다 한 톤 흐리게 둬서 읽는 순서가 아이콘이 아니라 글자에서
 * 시작하게 한다. flex-none 이 없으면 긴 항목에서 아이콘이 찌그러진다.
 */
export const MENU_ICON_CLASS = 'size-4 flex-none text-neutral-400'

/** 판을 여는 버튼 — 아바타와 종이 같은 크기로 나란히 서도록 */
export const MENU_TRIGGER_CLASS =
  'grid size-9 cursor-pointer place-items-center rounded-full ring-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-neutral-400'
