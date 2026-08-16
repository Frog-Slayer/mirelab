import { useEffect } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import Stars from '@/components/Stars'
import { getShelfEntry } from '@/mocks/api'
import { SlotType, Visibility } from '@/types'

interface Props {
  workId: string
  userId: string
  onClose: () => void
}

/**
 * 스터디 문서를 보면서 내 서재의 기록을 곁들여 보는 서랍.
 * 내 서재 상세의 '다같이 보기' 와 정확히 반대 방향이다.
 * 여기서도 읽기만 한다 — 쓰는 곳은 내 서재 한 군데뿐이어야 헷갈리지 않는다.
 */
export default function MyRecordDrawer({ workId, userId, onClose }: Props) {
  const { data, isPending } = useQuery({
    queryKey: ['shelfEntry', userId, workId],
    queryFn: () => getShelfEntry(userId, workId),
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const written = data?.slots.filter((slot) =>
    data.values.some((v) => v.slotDefId === slot.id && !isEmpty(v.value)),
  )

  return (
    <>
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
              My Shelf
            </span>
            <span className="text-sm font-medium">내 기록</span>
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

        {isPending && <p className="p-5 text-sm text-neutral-400">불러오는 중…</p>}

        {data && (
          <div className="flex flex-col gap-5 p-5">
            {written?.length === 0 && (
              <p className="text-sm text-neutral-400">아직 이 책에 쓴 기록이 없습니다.</p>
            )}

            {data.slots.map((slot) => {
              const v = data.values.find((x) => x.slotDefId === slot.id)
              if (!v || isEmpty(v.value)) return null
              return (
                <div key={slot.id} className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] tracking-[0.1em] text-neutral-400 uppercase">
                    {slot.name}
                    {slot.visibility === Visibility.PRIVATE && ' · 🔒'}
                  </span>
                  {slot.type === SlotType.RATING && 'n' in v.value && (
                    <div className="flex items-baseline gap-2">
                      <Stars value={v.value.n} size="sm" />
                      <span className="font-mono text-xs text-neutral-500 tabular-nums">
                        {v.value.n.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {slot.type !== SlotType.RATING && 'text' in v.value && (
                    <p className="text-sm whitespace-pre-wrap text-neutral-700">{v.value.text}</p>
                  )}
                  {'items' in v.value && (
                    <ul className="flex flex-col gap-1 text-sm text-neutral-700">
                      {v.value.items.map((item, i) => (
                        <li key={i}>· {item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}

            <Link
              to={`/shelf/${workId}`}
              className="border-t border-neutral-100 pt-4 text-xs text-emerald-700 hover:underline"
            >
              내 서재에서 고치기 →
            </Link>
          </div>
        )}
      </aside>
    </>
  )
}

function isEmpty(value: { n?: number } | Record<string, unknown>): boolean {
  if ('n' in value) return !value.n
  if ('text' in value) return !String(value.text ?? '').trim()
  if ('items' in value) return (value.items as string[]).filter((s) => s.trim()).length === 0
  return true
}
