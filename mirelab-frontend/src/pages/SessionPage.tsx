import { Link, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Cover from '@/components/Cover'
import SlotField from '@/components/slots/SlotField'
import SharedItemsField from '@/components/slots/SharedItemsField'
import { useCurrentUser } from '@/hooks/currentUser'
import { useStudy } from '@/hooks/useStudy'
import { addMemo, getSession, publish, removeMemo, saveValue } from '@/mocks/api'
import { formatDday, formatMeetAt } from '@/lib/format'
import type { SlotDef } from '@/types'
import { SlotScope, Visibility } from '@/types'

export default function SessionPage() {
  const { sessionId = '' } = useParams()
  const { user } = useCurrentUser()
  const { study, members } = useStudy()
  const qc = useQueryClient()

  const { data, isPending } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => getSession(sessionId),
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['session', sessionId] })
    qc.invalidateQueries({ queryKey: ['currentSession'] })
    qc.invalidateQueries({ queryKey: ['sessions'] })
  }

  const save = useMutation({ mutationFn: saveValue, onSuccess: refresh })
  const submit = useMutation({ mutationFn: () => publish(sessionId, user!.id), onSuccess: refresh })
  const createMemo = useMutation({ mutationFn: addMemo, onSuccess: refresh })
  const deleteMemo = useMutation({ mutationFn: removeMemo, onSuccess: refresh })

  if (isPending) return <p className="text-sm text-neutral-400">불러오는 중…</p>
  if (!data || !user || !study)
    return <p className="text-sm text-neutral-500">모임을 찾을 수 없습니다.</p>

  const { session, work, slots, values, memos } = data

  const personalSlots = slots.filter((s) => s.scope === SlotScope.PERSONAL)
  const sharedSlots = slots.filter((s) => s.scope === SlotScope.SHARED)
  const myValues = values.filter((value) => value.userId === user.id)
  const hasMyContent = myValues.length > 0
  const hasDraft = myValues.some((value) => value.draft)
  const submitted = hasMyContent && !hasDraft

  return (
    <div className="flex flex-col gap-8">
      <Link
        to={`/${study.slug}/sessions`}
        className="text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← 모임 기록
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-neutral-200 pb-7">
        <div className="flex gap-5">
          {work && <Cover work={work} />}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-neutral-500">{formatMeetAt(session.meetAt)}</span>
            <h1 className="text-3xl leading-tight font-semibold tracking-[-0.03em]">
              {work?.title ?? session.title}
            </h1>
            {work && <span className="text-base text-neutral-500">{session.title}</span>}
            {work && (
              <Link
                to={`/${study.slug}/books/${work.id}`}
                className="mt-1 text-sm text-emerald-700 hover:underline"
              >
                작품 상세 →
              </Link>
            )}
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            session.closed ? 'bg-neutral-200 text-neutral-600' : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {session.closed ? '마감됨' : (formatDday(session.meetAt) ?? '날짜 미정')}
        </span>
      </header>

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
        <section className="flex flex-col gap-5 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm lg:sticky lg:top-32">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">내 준비</h2>
              <p className="mt-1 text-sm leading-relaxed text-neutral-500">
                쓰는 동안에는 나만 보고, 제출한 뒤 함께 나눕니다.
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs ${
                submitted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {submitted ? '제출 완료' : hasMyContent ? '작성 중' : '미작성'}
            </span>
          </div>

          {personalSlots.map((slot) => {
            const value = myValues.find((item) => item.slotDefId === slot.id)
            return (
              <div key={slot.id} className="flex flex-col gap-2 border-t border-neutral-100 pt-5">
                <SlotLabel slot={slot} />
                <SlotField
                  slot={slot}
                  value={value?.value}
                  onSave={(next) =>
                    save.mutate({
                      targetId: sessionId,
                      slotDefId: slot.id,
                      userId: user.id,
                      value: next,
                      draft: true,
                    })
                  }
                />
              </div>
            )
          })}

          {personalSlots.length === 0 && (
            <p className="text-sm text-neutral-500">이 모임에 준비할 개인 칸이 없습니다.</p>
          )}

          <button
            type="button"
            disabled={!hasMyContent || (!hasDraft && submitted) || submit.isPending}
            onClick={() => submit.mutate()}
            className="app-button app-button-primary self-start"
          >
            {submit.isPending ? '제출 중…' : submitted ? '제출 완료' : '내 준비 제출하기'}
          </button>
        </section>

        {/* 다같이 쓰는 칸 */}
        <section className="flex flex-col gap-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-5">
            <div>
              <h2 className="text-xl font-semibold">함께 정리</h2>
              <p className="mt-1 text-sm text-neutral-500">모임에서 같이 다듬어가는 기록입니다.</p>
            </div>
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-500">
              실시간 준비 중
            </span>
          </div>

          {sharedSlots.map((slot) => (
            <div
              key={slot.id}
              className="flex flex-col gap-4 border-b border-neutral-100 pb-7 last:border-0 last:pb-0"
            >
              <SlotLabel slot={slot} />
              <SharedItemsField
                slot={slot}
                value={values.find((v) => v.slotDefId === slot.id && v.userId === null)?.value}
                memos={memos.filter((m) => m.slotDefId === slot.id)}
                users={members}
                currentUserId={user.id}
                onSave={(value) =>
                  save.mutate({
                    targetId: sessionId,
                    slotDefId: slot.id,
                    userId: null,
                    value,
                    draft: false,
                  })
                }
                onAddMemo={({ itemId, text, isPrivate }) =>
                  createMemo.mutate({
                    targetId: sessionId,
                    slotDefId: slot.id,
                    itemId,
                    userId: user.id,
                    text,
                    isPrivate,
                  })
                }
                onRemoveMemo={(memoId) => deleteMemo.mutate(memoId)}
              />
            </div>
          ))}

          {sharedSlots.length === 0 && (
            <p className="text-sm text-neutral-500">함께 정리할 칸이 없습니다.</p>
          )}
        </section>
      </div>
    </div>
  )
}

function SlotLabel({ slot }: { slot: SlotDef }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold">{slot.name}</span>
      {slot.visibility === Visibility.PRIVATE && (
        <span className="text-xs text-neutral-400">🔒 나만</span>
      )}
      {slot.visibility === Visibility.AFTER_DEADLINE && (
        <span className="text-xs text-neutral-400">마감 후 공개</span>
      )}
      {slot.sessionId && (
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
          이번 모임만
        </span>
      )}
    </div>
  )
}
