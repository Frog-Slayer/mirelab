import { kindLabel } from '@/lib/workKind'
import type { WorkKind } from '@/types'

/**
 * 작품 종류를 글자로만 보여준다. 이 표시가 붙는 곳(홈 카드·작품 목록)에는 이미 표지가
 * 나란히 있어서, 아이콘까지 두면 같은 말을 두 번 하는 셈이라 글자만 남겼다.
 */
export default function KindTag({ kind, className = '' }: { kind: WorkKind; className?: string }) {
  return (
    <span className={`inline-flex items-center text-xs font-medium text-neutral-500 ${className}`}>
      {kindLabel[kind]}
    </span>
  )
}
