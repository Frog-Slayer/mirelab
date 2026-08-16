import type { User } from '@/types'

interface Props {
  addedBy?: string
  reason?: string
  users: User[]
  size?: 'sm' | 'md'
}

/** 누가 왜 골랐는지. 명예의 전당·라이브러리·작품 상세에서 같은 모양으로 쓴다 */
export default function PickNote({ addedBy, reason, users, size = 'sm' }: Props) {
  const who = users.find((u) => u.id === addedBy)
  if (!who && !reason) return null

  const text = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <div className={`flex flex-col gap-0.5 ${text}`}>
      {who && (
        <span className="flex items-center gap-1.5 text-neutral-500">
          <span className={`size-1.5 rounded-full ${who.color}`} aria-hidden />
          {who.name} 선정
        </span>
      )}
      {reason && <p className="text-neutral-600">{reason}</p>}
    </div>
  )
}
