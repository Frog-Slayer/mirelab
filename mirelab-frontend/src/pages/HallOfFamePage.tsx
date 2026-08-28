import { useQuery } from '@tanstack/react-query'
import type { BookcaseItem } from '@/components/Bookcase'
import CompletedArchive from '@/components/CompletedArchive'
import PostList from '@/components/PostList'
import RecentWorks from '@/components/RecentWorks'
import { useStudy } from '@/hooks/useStudy'
import { getLibrary, type LibraryEntry } from '@/lib/workApi'
import { getStudyPosts } from '@/lib/postApi'
import { WorkStatus } from '@/types'

/** 최근 추가된 후보 작품은 4개까지만 보여준다 (그리드 한 줄과 맞춘 개수) */
const RECENT_WORKS_LIMIT = 4

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

  if (!study) return null

  const toItem = (work: LibraryEntry, rank?: number): BookcaseItem => ({
    id: work.id,
    title: work.title,
    author: work.author,
    year: work.year,
    kind: work.kind,
    status: work.status,
    href: `/${study.slug}/books/${work.id}`,
    average: work.average,
    voterCount: work.voterCount,
    addedBy: work.addedBy,
    reason: work.reason,
    description: work.description,
    coverUrl: work.coverUrl,
    actors: work.actors,
    rank,
    finishedAt: work.finishedAt,
  })

  // 아카이브는 완료작만 보여준다. 읽는 중·후보를 포함한 목록은 상단의 '작품 목록'에서 확인한다.
  const completedWorks = allWorks.filter((w) => w.status === WorkStatus.DONE)
  const completedItems = [...completedWorks]
    .sort((a, b) => b.average - a.average)
    .map((work, index) => toItem(work, index + 1))

  // 아직 안 읽은 후보 중 최근에 담긴 순서로 보여준다. addedAt이 없는 옛 데이터는
  // epoch 취급되어 자연히 맨 뒤로 밀린다.
  const candidateWorks = allWorks.filter((w) => w.status === WorkStatus.CANDIDATE)
  const recentItems = [...candidateWorks]
    .sort((a, b) => new Date(b.addedAt ?? 0).getTime() - new Date(a.addedAt ?? 0).getTime())
    .slice(0, RECENT_WORKS_LIMIT)
    .map((work) => toItem(work))

  return (
    <div className="flex flex-col gap-10">
      {isPending && <p className="text-sm text-neutral-400">불러오는 중…</p>}

      <CompletedArchive items={completedItems} studySlug={study.slug} />

      {posts.length > 0 && <PostList posts={posts} />}

      {recentItems.length > 0 && (
        <RecentWorks items={recentItems} users={members} studySlug={study.slug} />
      )}
    </div>
  )
}
