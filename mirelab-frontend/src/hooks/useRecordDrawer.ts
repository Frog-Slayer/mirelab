import { useOutletContext } from 'react-router'

export interface RecordDrawerContext {
  open: boolean
  setOpen: (updater: boolean | ((prev: boolean) => boolean)) => void
}

/**
 * 좌측 "내 메모" 드로어의 열림 상태. RootLayout 이 <main> 옆 공간을 미리 만들어야
 * 해서(밀어내기), 상태를 RootLayout 에 두고 Outlet context 로 내려준다.
 */
export function useRecordDrawer() {
  return useOutletContext<RecordDrawerContext>()
}
