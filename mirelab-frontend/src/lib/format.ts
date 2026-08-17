const DAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 모임 일시는 미정일 수 있다 — 정해진 주기가 없는 스터디라서 */
export function formatMeetAt(iso: string | null): string {
  if (!iso) return '날짜 미정'
  const d = new Date(iso)
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${d.getMonth() + 1}/${d.getDate()} (${DAYS[d.getDay()]}) ${time}`
}

export function formatDday(iso: string | null): string | null {
  if (!iso) return null
  const target = new Date(iso)
  const now = new Date()
  const days = Math.ceil((target.getTime() - now.getTime()) / 86_400_000)
  if (days === 0) return '오늘'
  return days > 0 ? `D-${days}` : `${-days}일 지남`
}

/** 평균은 4.27 처럼 나온다. 반올림을 줄여 실제 값에 가깝게 보여준다 */
export function formatRating(n: number): string {
  return n.toFixed(2)
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
