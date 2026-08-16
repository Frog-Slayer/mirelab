import { useEffect } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import Stars from '@/components/Stars'
import { getStudyMembers, getWork, getWorkSlots } from '@/mocks/api'
import { formatMeetAt, formatRating } from '@/lib/format'
import type { Study } from '@/types'
import { SlotType } from '@/types'

interface Props {
  workId: string
  study: Study
  onClose: () => void
}

/**
 * 내 기록을 쓰면서 스터디 기록을 곁들여 보는 서랍.
 * 읽기 전용이다 — 쓰는 곳은 각자 한 군데뿐이어야 헷갈리지 않는다.
 */
export default function StudyRecordDrawer({ workId, study, onClose }: Props) {
  const { data } = useQuery({ queryKey: ['work', workId], queryFn: () => getWork(workId) })
  const { data: members = [] } = useQuery({
    queryKey: ['studyMembers', study.id],
    queryFn: () => getStudyMembers(study.id),
  })
  const { data: workSlots } = useQuery({
    queryKey: ['workSlots', study.id, workId],
    queryFn: () => getWorkSlots(study.id, workId),
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const blurbSlot = workSlots?.slots.find((s) => s.type === SlotType.TEXT_SHORT)
  const blurbOf = (userId: string) => {
    const v = workSlots?.values.find((x) => x.slotDefId === blurbSlot?.id && x.userId === userId)
    return v && 'text' in v.value ? v.value.text : ''
  }

  return (
    <>
      {/* 좁은 화면에서 뒤를 가린다 */}
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="fixed inset-0 z-20 cursor-default bg-neutral-900/20 lg:hidden"
      />

      <aside className="fixed inset-y-0 right-0 z-30 flex w-[min(24rem,100vw)] flex-col overflow-y-auto border-l border-neutral-200 bg-white shadow-xl motion-safe:animate-[slide-in_.15s_ease-out]">
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-neutral-200 bg-white px-5 py-3">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] tracking-[0.13em] text-neutral-400 uppercase">
              다같이
            </span>
            <span className="text-sm font-medium">{study.name}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-neutral-400 hover:text-neutral-700"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {!data ? (
          <p className="p-5 text-sm text-neutral-400">불러오는 중…</p>
        ) : (
          <div className="flex flex-col gap-6 p-5">
            {data.work.voterCount > 0 ? (
              <section className="flex flex-col gap-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-3xl leading-none tabular-nums">
                    {formatRating(data.work.average)}
                  </span>
                  <Stars value={data.work.average} size="sm" />
                  <span className="text-xs text-neutral-500">{data.work.voterCount}명</span>
                </div>

                <div className="flex flex-col gap-2">
                  {members.map((m) => {
                    const score = data.work.ratings[m.id]
                    if (score === undefined) return null
                    return (
                      <div key={m.id} className="flex flex-col gap-0.5">
                        <div className="flex items-baseline gap-2 text-sm">
                          <span
                            className={`size-2 flex-none rounded-full ${m.color}`}
                            aria-hidden
                          />
                          <span className="w-10 flex-none text-neutral-600">{m.name}</span>
                          <Stars value={score} size="sm" />
                          <span className="font-mono text-xs text-neutral-500 tabular-nums">
                            {score.toFixed(1)}
                          </span>
                        </div>
                        {blurbOf(m.id) && (
                          <p className="pl-4 text-xs text-neutral-600">{blurbOf(m.id)}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            ) : (
              <p className="text-sm text-neutral-400">아직 아무도 평가하지 않았습니다.</p>
            )}

            <section className="flex flex-col gap-2 border-t border-neutral-100 pt-4">
              <span className="font-mono text-[10px] tracking-[0.13em] text-neutral-400 uppercase">
                회차 {data.sessions.length}번
              </span>
              {data.sessions.map((session, i) => (
                <Link
                  key={session.id}
                  to={`/${study.slug}/w/${session.id}`}
                  className="flex items-baseline gap-2 text-sm hover:underline"
                >
                  <span className="w-4 flex-none font-mono text-xs text-neutral-400 tabular-nums">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate">{session.closed ? '마감됨' : '예정'}</span>
                  <span className="font-mono text-[11px] text-neutral-400">
                    {formatMeetAt(session.meetAt)}
                  </span>
                </Link>
              ))}
              {data.sessions.length === 0 && (
                <p className="text-sm text-neutral-400">아직 회차가 없습니다.</p>
              )}
            </section>

            <Link
              to={`/${study.slug}/books/${workId}`}
              className="text-xs text-emerald-700 hover:underline"
            >
              스터디 작품 페이지로 →
            </Link>
          </div>
        )}
      </aside>
    </>
  )
}
