export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

const white = {
  gradient:
    'linear-gradient(155deg, #ffffff 0%, #f5f5f5 25%, #e5e5e5 50%, #f8f8f8 75%, #ffffff 100%)',
  ring: '#a3a3a3',
  text: '#525252',
}

const rankStickerColors: Record<Rank, { gradient: string; ring: string; text: string }> = {
  1: {
    gradient:
      'linear-gradient(155deg, #fff8dd 0%, #f6d365 22%, #caa233 45%, #8a6210 62%, #f9e79a 80%, #d4af37 100%)',
    ring: '#7a5608',
    text: '#4a3400',
  },
  2: {
    gradient:
      'linear-gradient(155deg, #ffffff 0%, #e6ebf0 22%, #a8b3bf 45%, #6b7684 62%, #eef2f6 80%, #b0b8c1 100%)',
    ring: '#5b6570',
    text: '#33383d',
  },
  3: {
    gradient:
      'linear-gradient(155deg, #f6dcc0 0%, #e0a469 22%, #a8632f 45%, #6e3d1c 62%, #f0c79a 80%, #b6733a 100%)',
    ring: '#5c331a',
    text: '#3c2410',
  },
  4: white,
  5: white,
  6: white,
  7: white,
  8: white,
  9: white,
}

// 별 모양은 아니고, 포스터에 붙인 스티커/실 같은 느낌의 톱니 원.
const stickerClipPath =
  'polygon(50% 0%, 61% 10%, 75% 5%, 80% 18%, 95% 20%, 93% 35%, 100% 50%, 93% 65%, 95% 80%, 80% 82%, 75% 95%, 61% 90%, 50% 100%, 39% 90%, 25% 95%, 20% 82%, 5% 80%, 7% 65%, 0% 50%, 7% 35%, 5% 20%, 20% 18%, 25% 5%, 39% 10%)'

/**
 * border/box-shadow 는 사각 박스 기준이라 톱니 clip-path 모양을 고르게 못 따라가서
 * (안쪽 흰 줄 두께가 꼭짓점/골 마다 달라 보임) 겹쳐 그리지 않는다.
 * 대신 같은 clip-path 를 쓰는 레이어를 크기만 줄여 겹쳐 쌓는다 — 링 두께가 어디서나 같다.
 *
 * 위치·회전은 쓰는 쪽에서 className 으로 정한다 (카드마다 붙는 자리가 다르다).
 */
export default function RankSticker({
  rank,
  size = 'lg',
  className = '',
}: {
  rank: Rank
  size?: 'sm' | 'lg'
  className?: string
}) {
  const { gradient, ring, text } = rankStickerColors[rank]
  const sizeCls =
    size === 'lg' ? 'size-11 text-sm sm:size-12 sm:text-base' : 'size-7 text-xs sm:size-8'
  const ringInset = size === 'lg' ? '2px' : '1.3px'
  const lineInset = size === 'lg' ? '3.5px' : '2.3px'

  return (
    <span
      aria-hidden
      className={`absolute ${sizeCls} ${className}`}
      style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.18))' }}
    >
      {/* 바깥 링 */}
      <span className="absolute inset-0" style={{ background: ring, clipPath: stickerClipPath }} />
      {/* 안쪽 흰 줄 */}
      <span
        className="absolute"
        style={{ inset: ringInset, background: '#fff', clipPath: stickerClipPath }}
      />
      {/* 금속 면 + 숫자 */}
      <span
        className="absolute grid place-items-center font-bold"
        style={{
          inset: lineInset,
          background: gradient,
          color: text,
          clipPath: stickerClipPath,
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,.6), inset 0 -1px 2px rgba(0,0,0,.3)',
          textShadow: '0 1px 0 rgba(255,255,255,.5), 0 -1px 1px rgba(0,0,0,.35)',
        }}
      >
        {rank}
      </span>
    </span>
  )
}
