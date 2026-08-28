import type { User } from '@/types'

interface Props {
  addedBy?: string
  reason?: string
  users: User[]
  size?: 'sm' | 'md'
  /** 한 줄로 잘라 보여줄지(기본) — 호버 카드처럼 여유가 있으면 false 로 전체를 보여준다 */
  truncate?: boolean
  /** 이름과 사유를 한 줄에 나란히 두지 않고, 이름 아래 사유가 오도록 세로로 쌓는다 */
  stacked?: boolean
}

/** 누가 왜 골랐는지. 명예의 전당·라이브러리·작품 상세에서 같은 모양으로 쓴다 */
export default function PickNote({
  addedBy,
  reason,
  users,
  size = 'sm',
  truncate = true,
  stacked = false,
}: Props) {
  const who = users.find((u) => u.id === addedBy)
  if (!who && !reason) return null

  const text = size === 'sm' ? 'text-xs' : 'text-sm'

  if (stacked) {
    return (
      <div className={`flex min-w-0 flex-col gap-0.5 ${text}`}>
        {who && <span className="font-semibold text-neutral-600">{who.name} 선정</span>}
        {reason && (
          <p className={`min-w-0 text-neutral-500 ${truncate ? 'truncate' : 'whitespace-normal'}`}>
            {reason}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={`flex min-w-0 items-baseline gap-1.5 ${truncate ? '' : 'flex-wrap'} ${text}`}>
      {who && <span className="flex-none font-semibold text-neutral-600">{who.name} 선정</span>}
      {reason && (
        <p className={`min-w-0 text-neutral-500 ${truncate ? 'truncate' : 'whitespace-normal'}`}>
          {reason}
        </p>
      )}
    </div>
  )
}
