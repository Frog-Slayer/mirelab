import { useState } from 'react'
import { apiAssetUrl } from '@/lib/api'
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
  // 볼륨이 갈리거나 파일이 사라지면 사진 주소만 남는다 — 그때 깨진 이미지 아이콘을 보여주는
  // 대신 기본 아바타로 떨어뜨린다(ProfilePictureStorage 가 약속하는 동작이다). 주소별로
  // 기억해두므로 사진을 새로 올리면 다시 시도한다.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null)

  // 이름이 이모지로 시작해도 반 글자만 잘리지 않게 코드포인트 단위로 자른다
  const initial = [...user.name.trim()][0] ?? '?'

  if (user.pictureUrl && user.pictureUrl !== brokenUrl) {
    return (
      <img
        src={apiAssetUrl(user.pictureUrl)}
        onError={() => setBrokenUrl(user.pictureUrl)}
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
