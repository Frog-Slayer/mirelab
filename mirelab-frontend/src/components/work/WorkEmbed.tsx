import Cover from '@/components/Cover'
import { kindLabel } from '@/lib/workKind'
import type { Work } from '@/types'

/**
 * 원본에서 가져온 작품 정보를 한 덩이로 보여주는 블록. 노션에 링크를 붙여 넣으면 생기는
 * 북마크 블록의 생김새를 빌렸다 — 테두리 한 겹, 그림자 없음, 왼쪽 글 / 오른쪽 썸네일.
 *
 * 이름과 달리 무엇을 임베드하지는 않는다. 작품에는 아직 원본 주소(sourceUrl)가 없어서
 * 눌러도 나갈 곳이 없다. 생김새만 빌린 것이고, 주소가 생기면 이 블록을 a 로 바꾸면 된다.
 *
 * 스스로 제목·저자·연도까지 들고 있는 건 이 블록만 떼어 다른 화면에 놓아도 말이 되게
 * 하려는 것이다 — 옆에 무엇이 서 있는지 모르는 채로도 "무슨 작품인지" 가 읽혀야 한다.
 */
export default function WorkEmbed({
  work,
  className = '',
}: {
  work: Pick<Work, 'title' | 'kind' | 'author' | 'year' | 'description' | 'coverUrl'>
  className?: string
}) {
  return (
    <div
      className={`flex items-stretch gap-4 rounded-lg border border-neutral-200 p-4 ${className}`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-sm font-medium text-neutral-900">{work.title}</p>

        {work.description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-neutral-600">
            {work.description}
          </p>
        )}

        {/* 노션 북마크의 맨 아랫줄(파비콘 + 도메인) 자리. 나갈 곳이 없으니 출처를 글로 적는다 */}
        <p className="mt-auto truncate pt-1 text-xs text-neutral-500">
          {[kindLabel[work.kind], work.author, work.year].filter(Boolean).join(' · ')}
        </p>
      </div>

      <Cover work={work} size="md" className="self-center" />
    </div>
  )
}
