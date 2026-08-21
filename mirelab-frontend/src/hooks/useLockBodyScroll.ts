import { useEffect } from 'react'

/**
 * 모달이 떠 있는 동안 뒤쪽 페이지가 스크롤되지 않게 막는다. 네이티브 <dialog>의
 * showModal()만으로는 배경 스크롤이 그대로 먹히는 브라우저가 있어 따로 잠근다.
 */
export function useLockBodyScroll() {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])
}
