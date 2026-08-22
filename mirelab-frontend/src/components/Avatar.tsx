import type { User } from '@/types'

const SIZES = {
  sm: 'size-7 text-xs',
  md: 'size-9 text-sm',
  lg: 'size-24 text-3xl',
} as const

/**
 * 사람을 나타내는 동그란 아이콘. 사진이 없으면 이름 첫 글자를 그 사람 색 위에 얹는다 —
 * 가입할 때 고른 색이 커서·뱃지에서 이미 그 사람을 뜻하므로, 사진이 없어도 누구인지 읽힌다.
 */
export default function Avatar({
  user,
  size = 'md',
  className = '',
}: {
  user: Pick<User, 'name' | 'color' | 'pictureUrl'>
  size?: keyof typeof SIZES
  className?: string
}) {
  // 이름이 이모지로 시작해도 반 글자만 잘리지 않게 코드포인트 단위로 자른다
  const initial = [...user.name.trim()][0] ?? '?'

  if (user.pictureUrl) {
    return (
      <img
        src={user.pictureUrl}
        // 곁에 이름이 함께 있거나 버튼에 aria-label 이 붙는다 — 여기서 또 읽어주면 중복이다
        alt=""
        className={`${SIZES[size]} shrink-0 rounded-full object-cover ${className}`}
      />
    )
  }

  return (
    <span
      aria-hidden
      className={`${SIZES[size]} ${user.color} flex shrink-0 items-center justify-center rounded-full font-medium text-white ${className}`}
    >
      {initial}
    </span>
  )
}
