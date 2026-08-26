import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Bookcase, type BookcaseItem } from '@/components/Bookcase'
import PostList from '@/components/PostList'
import { useStudy } from '@/hooks/useStudy'
import { getLibrary, type LibraryEntry } from '@/lib/workApi'
import { getStudyPosts } from '@/lib/postApi'
import { WorkStatus } from '@/types'

/** 책장 위 칸에는 별점 상위 10개까지만 꽂는다 */
const BOOKCASE_LIMIT = 10

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

      {posts.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <PostList posts={posts} />
          <PlaceholderSection />
        </div>
      )}
    </div>
  )
}

/** 오른쪽 절반에 뭐가 들어갈지 아직 안 정해져서 자리만 잡아둔다 */
function PlaceholderSection() {
  return (
    <section className="flex flex-col gap-4">
      <div className="border-b border-neutral-200 pb-3">
        <h2 className="text-xl font-semibold tracking-[-0.03em]">임시 공간</h2>
      </div>

      <div className="flex flex-col gap-2.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            aria-hidden
            className="animate-pulse rounded-lg border border-neutral-200 bg-white p-3.5"
          >
            <div className="h-4 w-1/3 rounded bg-neutral-200" />
            <div className="mt-3 h-3 w-full rounded bg-neutral-100" />
            <div className="mt-2 h-3 w-2/3 rounded bg-neutral-100" />
          </div>
        ))}
      </div>
    </section>
  )
}
