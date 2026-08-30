/**
 * 완료작 순위 규칙 — 홈 아카이브와 작품 상세가 같은 답을 내야 하므로 여기 한 벌만 둔다.
 * 규칙이 두 벌이면 같은 모양의 스티커가 화면마다 다른 뜻을 갖게 된다.
 */

export interface RankableWork {
  id: string
  average: number
  voterCount: number
  finishedAt?: string | null
  /** 공개된 개별 점수 — 평균이 같을 때 순위를 가른다 */
  publishedRatings?: number[]
}

export function completedYearOf(work: Pick<RankableWork, 'finishedAt'>): number | null {
  return work.finishedAt ? new Date(work.finishedAt).getFullYear() : null
}

/** 남에게 공개된 점수만 추린다 — ratings 에는 나만 보는 내 점수도 섞여 있다 */
export function publishedRatingsOf(work: {
  ratings: Record<string, number>
  publishedRatingUserIds: string[]
}): number[] {
  return work.publishedRatingUserIds
    .map((userId) => work.ratings[userId])
    .filter((score): score is number => typeof score === 'number')
}

/**
 * 최고·최저를 하나씩 뺀 나머지의 평균. 점수가 둘 이하면 다 잘려나가 남는 게 없으므로
 * 비교할 수 없다는 뜻으로 null 을 준다.
 */
function trimmedAverage(scores: number[] | undefined): number | null {
  if (!scores || scores.length < 3) return null

  const middle = [...scores].sort((a, b) => a - b).slice(1, -1)
  return middle.reduce((sum, score) => sum + score, 0) / middle.length
}

/** 오래된 것이 앞으로. 끝난 날이 없는 것은 언제인지 알 수 없으니 뒤로 민다 */
function byOldest(a: string | null | undefined, b: string | null | undefined): number {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return a.localeCompare(b)
}

/**
 * 완료 연도별 공개 평점 1~3위를 작품 id 로 찾을 수 있게 돌려준다.
 *
 * 아무도 공개로 매기지 않은 작품(voterCount 0)은 평균이 0 이라 등수에서 뺀다 — 안 그러면
 * "0점짜리 3위"가 생긴다. 평균이 같으면 최고·최저를 뺀 나머지의 평균으로 가르고, 그마저
 * 같거나 점수가 둘 이하라 잘라낼 게 없으면 완료순을 따른다.
 */
export function topRanksByYear(works: RankableWork[]): Map<string, 1 | 2 | 3> {
  const byYear = new Map<number, RankableWork[]>()
  for (const work of works) {
    const year = completedYearOf(work)
    if (year === null || work.voterCount <= 0) continue

    const bucket = byYear.get(year)
    if (bucket) bucket.push(work)
    else byYear.set(year, [work])
  }

  const ranks = new Map<string, 1 | 2 | 3>()
  for (const bucket of byYear.values()) {
    // 먼저 완료순으로 세워두면, 뒤이은 정렬이 안정 정렬이라 동점은 완료순 그대로 남는다.
    bucket
      .sort((a, b) => byOldest(a.finishedAt, b.finishedAt))
      .sort((a, b) => {
        const byAverage = b.average - a.average
        if (byAverage !== 0) return byAverage

        const aTrimmed = trimmedAverage(a.publishedRatings)
        const bTrimmed = trimmedAverage(b.publishedRatings)
        if (aTrimmed !== null && bTrimmed !== null) return bTrimmed - aTrimmed

        return 0
      })
      .slice(0, 3)
      .forEach((work, index) => ranks.set(work.id, (index + 1) as 1 | 2 | 3))
  }

  return ranks
}
