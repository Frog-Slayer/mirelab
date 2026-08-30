import { useEffect, useRef, useState } from 'react'
import { Check, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { clearDraft, readDraft, writeDraft } from '@/lib/draftStore'
import { addWorkNote, updateWorkNote } from '@/lib/noteApi'
import { NOTE_KIND_ORDER, noteKindIcon, noteKindLabel, noteKindPlaceholder } from '@/lib/noteKind'
import type { NoteKind, Work } from '@/types'
import { NoteKind as Kind } from '@/types'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/**
 * 메모 한 장을 쓰는 부분 — 종류 칩 · 글 상자 · 남기기 버튼.
 *
 * 담기는 틀이 둘이라 따로 떼어 뒀다([CurrentBookDock]). 좁은 화면에서는 광고 띠 아래에
 * 이어붙어 한 시트가 되고, 넓은 화면에서는 표지 옆에 눕는 카드가 된다. 틀은 달라도
 * 쓰는 자리는 하나여야 한다 — 두 벌로 두면 초안과 저장 흐름이 갈라진다.
 *
 * **던져 넣는 입구일 뿐, 읽는 자리가 아니다.** 쌓인 메모를 보고 고치는 곳은 작품 상세의
 * "내 메모" 서랍([MyRecordDrawer]) 하나뿐이다.
 */
export default function NoteForm({ work, autoFocus = true }: { work: Work; autoFocus?: boolean }) {
  const qc = useQueryClient()
  const draftKey = `quick:${work.id}`

  const [kind, setKind] = useState<NoteKind>(Kind.MEMO)
  // 못 보낸 글은 브라우저에 맡겨 둔다([draftStore]) — 되살릴지 묻지 않고 그대로 되돌린다.
  // 여기 있는 건 아직 아무 데도 안 들어간 초안이라, 물어볼 만한 "서버 값" 자체가 없다.
  const [text, setText] = useState(() => readDraft(draftKey) ?? '')
  const [state, setState] = useState<SaveState>('idle')

  /** 만들어는 놓고 본문을 못 넣은 메모. 다시 눌렀을 때 빈 메모를 또 만들지 않게 붙든다 */
  const pendingNoteId = useRef<string | null>(null)
  const box = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (autoFocus) box.current?.focus()
  }, [autoFocus])

  const change = (next: string) => {
    setText(next)
    // 저장 요청을 기다리지 않고 바로 적는다 — 막아야 하는 건 보내기 전에 탭이 닫히는 경우다
    writeDraft(draftKey, next)
    if (state !== 'idle') setState('idle')
  }

  /**
   * 메모는 빈 채로 만들어진 뒤 본문이 따로 들어간다([addWorkNote] · [updateWorkNote]).
   * 서랍은 만들자마자 그 자리에 쓰니까 그 두 걸음이 안 보이지만, 여기서는 한 번에
   * 끝나야 해서 둘을 이어 붙인다. 중간에 끊기면 만들어 둔 id 를 들고 있다가 그것에 다시
   * 넣는다 — 다시 만들면 본문 없는 메모가 서랍에 쌓인다.
   */
  const submit = async () => {
    const body = text.trim()
    if (!body || state === 'saving') return

    setState('saving')
    try {
      if (!pendingNoteId.current) {
        pendingNoteId.current = (await addWorkNote({ workId: work.id, kind })).id
      }
      // kind 를 같이 보내는 이유: 만들어 둔 뒤에 종류를 바꿨을 수 있다
      await updateWorkNote({ id: pendingNoteId.current, kind, body })

      pendingNoteId.current = null
      setText('')
      clearDraft(draftKey)
      setState('saved')
      // 작품 상세를 열어 두고 있었다면 그 서랍에 방금 것이 곧바로 나타나야 한다
      void qc.invalidateQueries({ queryKey: ['workNotes', work.id] })
      box.current?.focus()
    } catch {
      setState('error')
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      {/* 서랍의 걸러 보는 칩과 같은 표를 본다([noteKind]) — 한 종류가 두 이름으로 안 불리게 */}
      <div className="flex flex-wrap gap-2">
        {NOTE_KIND_ORDER.map((k) => {
          const Icon = noteKindIcon[k]
          const on = k === kind
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => setKind(k)}
              className={`app-pill ${
                on
                  ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/30 hover:bg-emerald-50 hover:text-emerald-800 hover:ring-emerald-600/30'
                  : ''
              }`}
            >
              <Icon
                aria-hidden
                className={`size-4 ${on ? 'text-emerald-700' : 'text-neutral-400'}`}
                strokeWidth={1.75}
              />
              {noteKindLabel[k]}
            </button>
          )
        })}
      </div>

      <textarea
        ref={box}
        value={text}
        onChange={(event) => change(event.target.value)}
        onKeyDown={(event) => {
          // 엔터는 줄바꿈이다 — 메모는 여러 줄로 적는 것이라 그걸 뺏으면 안 된다.
          // 손을 떼지 않고 보내는 길만 하나 열어 둔다.
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void submit()
        }}
        placeholder={noteKindPlaceholder[kind]}
        className="app-input min-h-24 w-full flex-1 resize-none leading-relaxed"
      />

      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-neutral-500 sm:inline">여기 적는 것은 나만 봅니다.</span>
        <SaveBadge state={state} />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!text.trim() || state === 'saving'}
          className="app-button app-button-primary ml-auto"
        >
          {noteKindLabel[kind]} 남기기
        </button>
      </div>
    </div>
  )
}

/** 저장 버튼이 있는 자리라 평소엔 조용하고, 결과만 짧게 알린다([MyRecordDrawer] 와 같은 말) */
function SaveBadge({ state }: { state: SaveState }) {
  if (state === 'idle') return null

  const { Icon, label, tone, spin } = {
    saving: { Icon: LoaderCircle, label: '남기는 중', tone: 'text-neutral-400', spin: true },
    saved: { Icon: Check, label: '남겼어요', tone: 'text-neutral-400', spin: false },
    error: { Icon: TriangleAlert, label: '실패', tone: 'text-rose-600', spin: false },
  }[state]

  return (
    <span aria-live="polite" className={`flex flex-none items-center gap-1 text-xs ${tone}`}>
      <Icon
        aria-hidden
        className={`size-3.5 ${spin ? 'animate-spin motion-reduce:animate-none' : ''}`}
        strokeWidth={2}
      />
      {label}
    </span>
  )
}
