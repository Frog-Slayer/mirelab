import { kindIcon, kindLabel, kindTextClass } from '@/lib/workKind'
import type { WorkKind } from '@/types'

/**
 * 작품 종류를 아이콘 + 글자로 보여준다. 알약 배지 대신 이 모양을 쓰는 곳이 여럿이라
 * (홈 카드·작품 목록) 한 컴포넌트로 둔다.
 */
export default function KindTag({ kind, className = '' }: { kind: WorkKind; className?: string }) {
  const Icon = kindIcon[kind]

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${kindTextClass[kind]} ${className}`}
    >
      <Icon className="size-4" aria-hidden />
      {kindLabel[kind]}
    </span>
  )
}
