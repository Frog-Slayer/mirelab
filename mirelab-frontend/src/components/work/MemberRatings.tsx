import { Star } from 'lucide-react'
import { Link } from 'react-router'
import Stars from '@/components/Stars'
import { formatRating } from '@/lib/format'
import type { RankedWork } from '@/lib/workApi'
import type { User } from '@/types'

/**
 * 멤버가 매긴 점수와 한줄평을 한 사람에 한 칸씩. 한 줄짜리 목록으로 눕혀도 봤는데,
 * 이건 "누가 몇 점을 줬나" 를 한눈에 훑는 자리라 칸이 나란히 늘어서는 편이 낫다 —
 * 목록은 위에서 아래로 한 명씩 읽게 만든다.
 *
 * 문서의 한 섹션이 아니라 [WorkOverview] 의 오른쪽 반쪽에 들어간다. 그래서 바깥 여백은
 * 스스로 갖지 않고(놓는 쪽이 정한다) 제목도 h1 과 겨루지 않을 만큼만 키운다.
 *
 * 다만 예전에 이 격자를 감싸던 옅은 판(app-panel)은 없앴다. 작품 페이지가 문서 한 장으로
 * 읽히도록 바뀌면서, 문서 한복판에 회색 판이 끼면 거기만 다른 화면처럼 떠 보인다.
 *
 * 내 칸만 눌린다 — 누르면 점수·한줄평을 고치는 창이 열린다. 남의 칸에서 눌리는 건
 * 이름(그 사람의 서재로 간다)뿐이다.
 */
export default function MemberRatings({
  work,
  members,
  currentUserId,
  blurbOf,
  onEditMine,
}: {
  work: RankedWork
  members: User[]
  currentUserId: string
  /** 그 사람이 남긴 한줄평. 공개 여부는 칸(slot)의 visibility 가 이미 가렸다 */
  blurbOf: (userId: string) => string
  onEditMine: () => void
}) {
  return (
    <section>
      {/*
        평균은 제목 줄 오른쪽 끝에 선다 — 멤버별 점수를 훑기 전에 "다 합치면 몇 점인지" 를
        먼저 보게 되고, 그 둘이 멀리 떨어져 있으면 눈이 오간다.
      */}
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">멤버별 평점</h2>

        {work.voterCount > 0 ? (
          <span className="flex items-center gap-2">
            <span className="font-serif text-2xl leading-none font-semibold tabular-nums">
              {formatRating(work.average)}
            </span>
            <Stars value={work.average} />
            <span className="text-xs text-neutral-500">{work.voterCount}명</span>
          </span>
        ) : (
          <span className="flex items-center gap-2 text-xs text-neutral-500">
            <Stars value={0} />
            평가 없음
          </span>
        )}
      </div>

      {/*
        한 줄에 하나씩 세로로 쌓는다. 반쪽 칸에서 둘씩 놓으면 칸 하나가 260px 남짓이라
        한줄평이 서너 줄로 접히는데, 그러면 한 줄로 남긴 말이 한 줄로 안 읽힌다.
      */}
      <div className="mt-4 flex flex-col gap-2">
        {members.map((member) => {
          // 남의 점수는 공개한 것만 내려오므로, 점수가 없다고 안 매긴 건 아니다 —
          // ratedUserIds 로 "비공개로 매김"과 "아직 안 매김"을 갈라 보여준다.
          const score = work.ratings[member.id]
          const mine = member.id === currentUserId
          const rated = work.ratedUserIds.includes(member.id)
          const published = work.publishedRatingUserIds.includes(member.id)
          const blurb = blurbOf(member.id)

          const content = (
            <>
              <span className="absolute top-2.5 right-3 flex items-center gap-1 text-xs text-neutral-500">
                {score === undefined ? (
                  <span className="text-neutral-400">{rated ? '비공개' : '아직'}</span>
                ) : (
                  <>
                    <Star aria-hidden className="size-3 fill-amber-400 text-amber-400" />
                    <span className="tabular-nums">{score.toFixed(1)}</span>
                  </>
                )}
              </span>

              <div className="flex items-center gap-1.5 pr-10">
                {mine ? (
                  <span className="truncate text-sm font-medium text-neutral-800">
                    {member.name}
                  </span>
                ) : (
                  <Link
                    to={`/@${member.username}`}
                    className="truncate text-sm font-medium text-neutral-800 hover:underline"
                  >
                    {member.name}
                  </Link>
                )}
                {/* 남의 칸은 점수 자리에 이미 공개 여부가 드러나니, 뱃지는 내 것만 */}
                {mine && rated && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      published
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    {published ? '공개' : '비공개'}
                  </span>
                )}
              </div>

              {/* 한줄평 공개 여부는 그 칸의 visibility 가 이미 정한다 — 평점을
                  비공개로 뒀다고 같이 가릴 일이 아니다 */}
              {blurb && <p className="text-xs text-neutral-600">{blurb}</p>}
            </>
          )

          return mine ? (
            <button
              key={member.id}
              type="button"
              onClick={onEditMine}
              className="app-tile relative flex h-full cursor-pointer flex-col gap-1.5 p-3 text-left ring-emerald-400/70 hover:ring-emerald-500"
            >
              {content}
            </button>
          ) : (
            <div key={member.id} className="app-tile relative flex h-full flex-col gap-1.5 p-3">
              {content}
            </div>
          )
        })}
      </div>
    </section>
  )
}
