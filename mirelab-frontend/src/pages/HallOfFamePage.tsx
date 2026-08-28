import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Bookcase, type BookcaseItem } from '@/components/Bookcase'
import PostList from '@/components/PostList'
import RecentWorks from '@/components/RecentWorks'
import { useStudy } from '@/hooks/useStudy'
import { getLibrary, type LibraryEntry } from '@/lib/workApi'
import { getStudyPosts } from '@/lib/postApi'
import { WorkStatus } from '@/types'

/** 책장 위 칸에는 별점 상위 10개까지만 꽂는다 */
const BOOKCASE_LIMIT = 10
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
  })

  // 책장은 완료작만 보여준다. 읽는 중·후보를 포함한 목록은 상단의 '작품 목록'에서 확인한다.
  const completedWorks = allWorks.filter((w) => w.status === WorkStatus.DONE)
  // 별점 상위 10개까지만 꽂고, 1~3위 표지에는 순위 스티커를 붙인다.
  const completedItems = completedWorks
    .sort((a, b) => b.average - a.average)
    .slice(0, BOOKCASE_LIMIT)
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
      <section className="flex flex-col gap-6">
        <div className="flex items-end justify-between gap-4 border-b border-neutral-200 pb-6">
          <div className="flex items-baseline gap-2">
            <h1 className="text-3xl font-semibold tracking-[-0.03em]">함께 읽은 책</h1>
            <span className="text-sm text-neutral-400">{completedWorks.length}편</span>
          </div>
          <Link
            to={`/${study.slug}/books`}
            className="shrink-0 text-sm font-medium text-neutral-500 hover:text-neutral-900"
          >
            더보기
          </Link>
        </div>

        {isPending && <p className="text-sm text-neutral-400">불러오는 중…</p>}

        <Bookcase completed={completedItems} others={[]} users={members} />
      </section>

      {posts.length > 0 && <PostList posts={posts} />}

      {recentItems.length > 0 && (
        <RecentWorks items={recentItems} users={members} studySlug={study.slug} />
      )}
    </div>
  )
}
