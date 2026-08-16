import { Link, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Cover from '@/components/Cover'
import SlotField from '@/components/slots/SlotField'
import { useCurrentUser } from '@/hooks/currentUser'
import { useStudy } from '@/hooks/useStudy'
import { getShelfEntry, saveValue } from '@/mocks/api'
import type { SlotDef } from '@/types'
import { Visibility, WorkKind, WorkStatus } from '@/types'

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

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <Link
        to={`/${currentStudy.slug}/shelf`}
        className="text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← 내 서재
      </Link>

      <header className="flex flex-wrap items-center gap-6 border-b border-neutral-200 pb-7">
        <div className="w-28">
          <Cover work={work} size="lg" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">
              {work.kind === WorkKind.MOVIE ? 'Movie' : 'Book'}
            </span>
            <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
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
            <p className="max-w-xl text-sm text-neutral-600">{work.description}</p>
          )}
          <span className="text-xs text-neutral-400">
            {study ? `${study.name} · 개인 기록은 스터디와 별개` : '혼자 읽은 책'}
          </span>
        </div>
      </header>

      <section className="flex flex-col gap-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">내 기록</h2>

        {slots.map((slot) => (
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

        {slots.length === 0 && (
          <p className="text-sm text-neutral-400">아직 작성할 수 있는 작품 기록 항목이 없습니다.</p>
        )}
      </section>
    </div>
  )
}
