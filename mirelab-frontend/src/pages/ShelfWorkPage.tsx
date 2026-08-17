import { Link, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Cover from '@/components/Cover'
import PersonalBlockNoteField from '@/components/slots/PersonalBlockNoteField'
import SlotField from '@/components/slots/SlotField'
import { useCurrentUser } from '@/hooks/currentUser'
import { useStudy } from '@/hooks/useStudy'
import { getShelfEntry, saveValue } from '@/mocks/api'
import type { SlotDef } from '@/types'
import { SlotType, Visibility, WorkKind, WorkStatus } from '@/types'

const statusLabel: Record<string, string> = {
  [WorkStatus.CANDIDATE]: '후보',
  [WorkStatus.READING]: '읽는 중',
  [WorkStatus.DONE]: '완료',
}

/**
 * 내 서재 안의 책 상세. 스터디에서 온 책도 여기서 기록하지만, 스터디 쪽 작품
 * 상세의 기록과는 별개다(각자 다른 targetId 를 쓴다 — mocks/api.ts 의 shelfTargetId).
 */
export default function ShelfWorkPage() {
  const { workId = '' } = useParams()
  const { user } = useCurrentUser()
  const { study: currentStudy } = useStudy()
  const qc = useQueryClient()

  const { data, isPending } = useQuery({
    queryKey: ['shelfEntry', user?.id, workId],
    queryFn: () => getShelfEntry(user!.id, workId),
    enabled: !!user,
  })

  const save = useMutation({
    mutationFn: saveValue,
    onSuccess: () => qc.invalidateQueries(),
  })

  if (isPending) return <p className="text-sm text-neutral-400">불러오는 중…</p>
  if (!data || !user || !currentStudy)
    return <p className="text-sm text-neutral-500">내 서재에 없는 책입니다.</p>

  const { work, study, slots, values } = data
  // 스터디에서 온 책은 스터디 쪽 기록과 안 겹치도록 다른 targetId 를 쓴다.
  const targetId = study ? `shelf:${work.id}` : work.id

  const valueOf = (slot: SlotDef) => values.find((v) => v.slotDefId === slot.id)

  const ratingSlot = slots.find((s) => s.type === SlotType.RATING)
  const blurbSlot = slots.find(
    (s) => s.type === SlotType.TEXT_SHORT && s.visibility !== Visibility.PRIVATE,
  )
  const consolidatedIds = new Set(
    [ratingSlot?.id, blurbSlot?.id].filter((id): id is string => !!id),
  )
  const otherSlots = slots.filter((slot) => !consolidatedIds.has(slot.id))
  const summarySlot = otherSlots.find((slot) => slot.name === '내 요약')
  const restSlots = otherSlots.filter((slot) => slot.id !== summarySlot?.id)

  return (
    <div className="flex flex-col gap-10">
      <Link
        to={`/${currentStudy.slug}/shelf`}
        className="text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← 내 서재
      </Link>

      <header className="flex gap-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="w-40 flex-none sm:w-44">
          <Cover work={work} size="lg" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 pt-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-neutral-400">
              {work.kind === WorkKind.MOVIE ? 'Movie' : 'Book'}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                work.status === WorkStatus.READING
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                  : 'border-neutral-200 text-neutral-500'
              }`}
            >
              {statusLabel[work.status]}
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">{work.title}</h1>
          <p className="text-sm text-neutral-500">
            {work.author} · {work.year}
          </p>
          {work.actors && work.actors.length > 0 && (
            <p className="text-xs text-neutral-400">출연 {work.actors.join(' · ')}</p>
          )}
          {work.description && (
            <p className="max-w-xl text-sm leading-relaxed text-neutral-600">{work.description}</p>
          )}
          <span className="text-xs text-neutral-400">{study ? study.name : '혼자 읽은 책'}</span>

          {(ratingSlot || blurbSlot) && (
            <div className="mt-auto flex flex-col gap-2 pt-2">
              {ratingSlot && (
                <SlotField
                  slot={ratingSlot}
                  value={valueOf(ratingSlot)?.value}
                  onSave={(value) =>
                    save.mutate({
                      targetId,
                      slotDefId: ratingSlot.id,
                      userId: user.id,
                      value,
                      draft: false,
                    })
                  }
                />
              )}
              {blurbSlot && (
                <SlotField
                  slot={blurbSlot}
                  value={valueOf(blurbSlot)?.value}
                  onSave={(value) =>
                    save.mutate({
                      targetId,
                      slotDefId: blurbSlot.id,
                      userId: user.id,
                      value,
                      draft: false,
                    })
                  }
                />
              )}
            </div>
          )}
        </div>
      </header>

      <section className="flex flex-col gap-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">내 기록</h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {summarySlot && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-neutral-700">
                {summarySlot.name}
                {summarySlot.visibility === Visibility.PRIVATE && ' · 🔒 나만'}
              </span>
              <div className="flex flex-1 flex-col">
                <PersonalBlockNoteField
                  key={workId}
                  value={valueOf(summarySlot)?.value}
                  onSave={(value) =>
                    save.mutate({
                      targetId,
                      slotDefId: summarySlot.id,
                      userId: user.id,
                      value,
                      draft: false,
                    })
                  }
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-6">
            {restSlots.map((slot) => (
              <div key={slot.id} className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-neutral-700">
                  {slot.name}
                  {slot.visibility === Visibility.PRIVATE && ' · 🔒 나만'}
                </span>
                <SlotField
                  slot={slot}
                  value={valueOf(slot)?.value}
                  onSave={(value) =>
                    save.mutate({
                      targetId,
                      slotDefId: slot.id,
                      userId: user.id,
                      value,
                      draft: false,
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {otherSlots.length === 0 && (
          <p className="text-sm text-neutral-400">아직 작성할 수 있는 작품 기록 항목이 없습니다.</p>
        )}
      </section>
    </div>
  )
}
