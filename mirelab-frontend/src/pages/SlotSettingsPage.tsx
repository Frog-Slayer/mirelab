import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addSlotDef, getSlotDefs, moveSlot, toggleSlotHidden } from '@/mocks/api'
import { useStudy } from '@/hooks/useStudy'
import type { SlotDef } from '@/types'
import { SlotOwner, SlotScope, SlotType, Visibility } from '@/types'

const typeLabel: Record<string, string> = {
  [SlotType.RATING]: '별점',
  [SlotType.TEXT_SHORT]: '짧은 글',
  [SlotType.TEXT_LONG]: '긴 글',
  [SlotType.LIST]: '목록',
  [SlotType.SHARED_ITEMS]: '항목 목록',
}

const visibilityLabel: Record<string, string> = {
  [Visibility.ALWAYS]: '항상 공개',
  [Visibility.AFTER_DEADLINE]: '마감 후 공개',
  [Visibility.PRIVATE]: '🔒 계속 비공개',
}

export default function SlotSettingsPage() {
  const qc = useQueryClient()
  const { study } = useStudy()
  const { data: slots = [] } = useQuery({
    queryKey: ['slotDefs', study?.id],
    queryFn: () => getSlotDefs(study!.id),
    enabled: !!study,
  })
  const refresh = () => qc.invalidateQueries()

  const create = useMutation({ mutationFn: addSlotDef, onSuccess: refresh })
  const toggle = useMutation({ mutationFn: toggleSlotHidden, onSuccess: refresh })
  const move = useMutation({
    mutationFn: ({ id, dir }: { id: string; dir: -1 | 1 }) => moveSlot(id, dir),
    onSuccess: refresh,
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">칸 관리</h1>
        <p className="text-sm text-neutral-500">
          위에서부터 작품 화면에 그려지는 순서입니다. 칸을 추가하면 다음부터 나타납니다.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {slots.map((slot, i) => (
          <li
            key={slot.id}
            className={`flex flex-wrap items-center gap-2 rounded-sm border border-neutral-200 px-3 py-2.5 ${
              slot.hidden ? 'opacity-50' : ''
            }`}
          >
            <div className="flex flex-col text-neutral-300">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => move.mutate({ id: slot.id, dir: -1 })}
                className="cursor-pointer leading-none hover:text-neutral-600 disabled:cursor-default disabled:opacity-30"
                aria-label="위로"
              >
                ▲
              </button>
              <button
                type="button"
                disabled={i === slots.length - 1}
                onClick={() => move.mutate({ id: slot.id, dir: 1 })}
                className="cursor-pointer leading-none hover:text-neutral-600 disabled:cursor-default disabled:opacity-30"
                aria-label="아래로"
              >
                ▼
              </button>
            </div>

            <span className="min-w-28 text-sm font-medium">{slot.name}</span>
            <Pill>{typeLabel[slot.type]}</Pill>
            <Pill accent={slot.scope === SlotScope.SHARED}>
              {slot.scope === SlotScope.SHARED ? '공동 · 실시간' : '개인별'}
            </Pill>
            <Pill>{visibilityLabel[slot.visibility]}</Pill>
            {slot.allowMemo && <Pill>💬 메모 허용</Pill>}
            {slot.owner === SlotOwner.SESSION && <Pill dashed>이번 모임만</Pill>}

            <div className="ml-auto flex items-center gap-3">
              {slot.hidden && (
                <span className="text-xs text-neutral-500">숨김 · 기록은 남아 있음</span>
              )}
              <button
                type="button"
                onClick={() => toggle.mutate(slot.id)}
                className="app-button app-button-ghost"
              >
                {slot.hidden ? '다시 쓰기' : '숨기기'}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <AddSlotForm onSubmit={(input) => create.mutate({ ...input, studyId: study!.id })} />
    </div>
  )
}

function AddSlotForm({
  onSubmit,
}: {
  onSubmit: (input: {
    name: string
    type: SlotType
    scope: SlotDef['scope']
    visibility: SlotDef['visibility']
  }) => void
}) {
  const [name, setName] = useState('')
  const [scope, setScope] = useState<SlotDef['scope']>(SlotScope.PERSONAL)
  const [type, setType] = useState<SlotType>(SlotType.TEXT_SHORT)
  const [visibility, setVisibility] = useState<SlotDef['visibility']>(Visibility.ALWAYS)

  const isShared = scope === SlotScope.SHARED

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        onSubmit({
          name: name.trim(),
          type: isShared ? SlotType.SHARED_ITEMS : type,
          scope,
          visibility,
        })
        setName('')
      }}
      className="flex flex-col gap-3 rounded-sm border border-dashed border-neutral-300 p-4"
    >
      <span className="text-xs font-medium text-neutral-500">칸 추가</span>

      <div className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름 — 예: 토론 주제"
          className="min-w-40 flex-1 rounded-sm border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
        />
        <Select value={scope} onChange={(v) => setScope(v as SlotDef['scope'])}>
          <option value={SlotScope.PERSONAL}>개인별</option>
          <option value={SlotScope.SHARED}>공동</option>
        </Select>
        <Select value={type} onChange={(v) => setType(v as SlotType)} disabled={isShared}>
          {isShared ? (
            <option value={SlotType.SHARED_ITEMS}>항목 목록</option>
          ) : (
            <>
              <option value={SlotType.RATING}>별점</option>
              <option value={SlotType.TEXT_SHORT}>짧은 글</option>
              <option value={SlotType.TEXT_LONG}>긴 글</option>
              <option value={SlotType.LIST}>목록</option>
            </>
          )}
        </Select>
        <Select value={visibility} onChange={(v) => setVisibility(v as SlotDef['visibility'])}>
          <option value={Visibility.ALWAYS}>항상 공개</option>
          <option value={Visibility.AFTER_DEADLINE}>마감 후 공개</option>
          <option value={Visibility.PRIVATE}>계속 비공개</option>
        </Select>
        <button type="submit" className="app-button app-button-primary">
          추가
        </button>
      </div>

      <p className="text-xs text-neutral-500">
        범위를 <em className="not-italic text-neutral-700">공동</em>으로 고르면 타입은 항목 목록으로
        고정되고 메모가 허용됩니다. 타입은 나중에 못 바꿉니다 — 바꿀 일이 생기면 새 칸을 만들어
        옮깁니다.
      </p>
    </form>
  )
}

function Select({
  value,
  onChange,
  disabled,
  children,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="cursor-pointer rounded-sm border border-neutral-200 px-2 py-2 text-sm text-neutral-700 disabled:cursor-default disabled:bg-neutral-50 disabled:text-neutral-400"
    >
      {children}
    </select>
  )
}

function Pill({
  children,
  accent,
  dashed,
}: {
  children: React.ReactNode
  accent?: boolean
  dashed?: boolean
}) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs whitespace-nowrap ${
        accent
          ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
          : `border-neutral-200 text-neutral-500 ${dashed ? 'border-dashed' : ''}`
      }`}
    >
      {children}
    </span>
  )
}
