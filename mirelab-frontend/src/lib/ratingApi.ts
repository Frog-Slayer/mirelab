import { api } from '@/lib/api'
import { openLiveStream } from '@/lib/liveStream'
import type { WorkRating } from '@/types'

/**
 * 별점과 한줄평. 둘은 한 행이고 공개 토글도 하나다 — 별점만 가리고 한줄평이 남으면
 * 가린 의미가 없기 때문이다.
 *
 * 남의 평가는 공개한 것만 실려 온다. 무엇이 보이는지는 서버가 정하므로(보는 사람마다
 * 다르다) 받는 쪽이 다시 거를 일이 없다.
 */
export function getWorkRatings(workId: string): Promise<WorkRating[]> {
  return api.get(`/works/${workId}/ratings`)
}

/** 빠뜨린 항목은 그대로 둔다 — 한줄평을 지우려면 빈 문자열을 보낸다 */
export function saveRating(input: {
  workId: string
  score?: number
  blurb?: string
}): Promise<WorkRating> {
  return api.put(`/works/${input.workId}/rating`, { score: input.score, blurb: input.blurb })
}

export function setRatingPublished(workId: string, published: boolean): Promise<void> {
  return api.patch(`/works/${workId}/rating-visibility`, { published })
}

/**
 * 이 작품의 평가가 누구에 의해서든 바뀌면 신호가 온다 — 내용은 없으니 받는 쪽이 평소
 * 경로로 다시 받아가면 된다. 끊을 때 부를 함수를 돌려준다.
 */
export function openWorkRatingEvents(
  workId: string,
  handlers: { onEvent: () => void; onConnectedChange?: (connected: boolean) => void },
): () => void {
  return openLiveStream(`/works/${workId}/rating-events`, handlers)
}
