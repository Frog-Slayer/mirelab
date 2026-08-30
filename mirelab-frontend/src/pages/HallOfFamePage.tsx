import { useQuery } from '@tanstack/react-query'
import type { BookcaseItem } from '@/components/Bookcase'
import CompletedArchive from '@/components/CompletedArchive'
import PostList from '@/components/PostList'
import BlurbTicker from '@/components/BlurbTicker'
import RecentWorks from '@/components/RecentWorks'
import { useStudy } from '@/hooks/useStudy'
import { getBlurbs, getLibrary, type LibraryEntry } from '@/lib/workApi'
import { getStudyPosts } from '@/lib/postApi'
import { publishedRatingsOf } from '@/lib/workRanking'
import { WorkStatus } from '@/types'

/** 최근 추가된 후보 작품은 4개까지만 보여준다 (그리드 한 줄과 맞춘 개수) */
const RECENT_WORKS_LIMIT = 4

/**
 * 오래된 것이 앞으로. 날짜가 없는 작품(이 필드가 생기기 전에 만들어진 것)은 언제인지 알 수
 * 없으니 있는 것들 뒤로 민다 — 오름차순이라고 해서 "모르는 것"을 맨 앞에 두면 아무 근거 없이
 * 제일 오래된 척이 된다.
 */
function byOldest(a: string | null | undefined, b: string | null | undefined): number {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return a.localeCompare(b)
}

export default function HallOfFamePage() {
  const { study, members } = useStudy()

  const { data: allWorks = [], isPending } = useQuery({
    queryKey: ['library', study?.slug],
    queryFn: () => getLibrary(study!.slug),
    enabled: !!study,
  })
  const { data: posts = [] } = useQuery({
    queryKey: ['studyPosts', study?.slug],
    queryFn: () => getStudyPosts(study!.slug),
    enabled: !!study,
  })
  const { data: blurbs = [] } = useQuery({
    queryKey: ['studyBlurbs', study?.slug],
    queryFn: () => getBlurbs(study!.slug),
    enabled: !!study,
  })

  if (!study) return null

  const toItem = (work: LibraryEntry): BookcaseItem => ({
    id: work.id,
    title: work.title,
    author: work.author,
    year: work.year,
    kind: work.kind,
    status: work.status,
    href: `/${study.slug}/books/${work.id}`,
    average: work.average,
    voterCount: work.voterCount,
    publishedRatings: publishedRatingsOf(work),
    addedBy: work.addedBy,
    reason: work.reason,
    description: work.description,
    coverUrl: work.coverUrl,
    actors: work.actors,
    finishedAt: work.finishedAt,
  })

  // 아카이브는 완료작만 보여준다. 읽는 중·후보를 포함한 목록은 상단의 '작품 목록'에서 확인한다.
  const completedWorks = allWorks.filter((w) => w.status === WorkStatus.DONE)
  // 다 읽은 순서대로(오래된 것이 앞) — 스터디가 지나온 길을 그대로 따라 읽는다.
  // 끝난 날이 없는 옛 데이터는 언제인지 알 수 없으니 맨 뒤로 민다.
  const completedItems = [...completedWorks]
    .sort((a, b) => byOldest(a.finishedAt, b.finishedAt))
    .map((work) => toItem(work))

  // 아직 안 읽은 후보 중 최근에 담긴 순서로 보여준다. addedAt이 없는 옛 데이터는
  // epoch 취급되어 자연히 맨 뒤로 밀린다.
  const candidateWorks = allWorks.filter((w) => w.status === WorkStatus.CANDIDATE)
  const recentItems = [...candidateWorks]
    .sort((a, b) => new Date(b.addedAt ?? 0).getTime() - new Date(a.addedAt ?? 0).getTime())
    .slice(0, RECENT_WORKS_LIMIT)
    .map((work) => toItem(work))

  return (
    <div className="flex flex-col gap-12">
      {isPending && <p className="text-sm text-neutral-500">불러오는 중…</p>}

      <CompletedArchive items={completedItems} users={members} studySlug={study.slug} />

      <BlurbTicker blurbs={blurbs} users={members} studySlug={study.slug} />

      {posts.length > 0 && <PostList posts={posts} />}

      {recentItems.length > 0 && (
        <RecentWorks items={recentItems} users={members} studySlug={study.slug} />
      )}
    </div>
  )
}
