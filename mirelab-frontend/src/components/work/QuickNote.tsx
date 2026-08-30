import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, LoaderCircle, NotebookPen, TriangleAlert, X } from 'lucide-react'
import Cover from '@/components/Cover'
import { useSwipeDismiss } from '@/hooks/useSwipeDismiss'
import { clearDraft, readDraft, writeDraft } from '@/lib/draftStore'
import { NOTE_KIND_ORDER, noteKindIcon, noteKindLabel, noteKindPlaceholder } from '@/lib/noteKind'
import { addWorkNote, updateWorkNote } from '@/lib/noteApi'
import { getCurrentSession } from '@/lib/scheduleApi'
import type { NoteKind, Study, Work } from '@/types'
import { NoteKind as Kind } from '@/types'

/**
 * 오른쪽 아래에서 지금 읽는 책에 메모 한 장을 던져 넣는 자리.
 *
 * 전에 이 자리에 있던 것은 다음 모임 카드였는데, 그건 전면 광고([ThisSessionAd])로
 * 옮겼다. 비는 자리에 "읽다가 떠오른 것을 그 자리에서 적는" 입구를 둔다 — 지금은 그러려면
 * 작품 상세까지 들어가서 서랍을 열어야 하고, 그 몇 번의 이동 동안 적으려던 것이 날아간다.
 *
 * **던져 넣는 입구일 뿐, 읽는 자리가 아니다.** 쌓인 메모를 보고 고치는 곳은 여전히 작품
 * 상세의 "내 메모" 서랍([MyRecordDrawer]) 하나뿐이다. 목록까지 여기서 보여주면 같은 것을
 * 두 군데서 읽게 되고, 그러면 어느 쪽이 최신인지 사람이 판단해야 한다.
 *
 * 같은 이유로 그 책의 상세를 보고 있는 동안에는 아예 안 뜬다 — 서랍이 바로 옆에 있는데
 * 쓰는 문을 하나 더 두면, 방금 적은 것이 어느 쪽에 있는지 헷갈린다.
 */
export default function QuickNote({ study }: { study: Study | null }) {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  // [ThisSessionAd] 와 같은 질의라 react-query 가 하나로 합친다 — 요청은 한 번만 나간다.
  const { data: current } = useQuery({
    queryKey: ['currentSession', study?.slug],
    queryFn: () => getCurrentSession(study!.slug),
    enabled: !!study,
  })

  const work = current?.work ?? null
  if (!study || !work) return null
  if (pathname.startsWith(`/${study.slug}/books/${work.id}`)) return null

  if (open) return <Composer work={work} onClose={() => setOpen(false)} />

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      /* pointer-events-auto 가 없으면 [FloatingStack] 을 뚫고 지나가 눌리지 않는다 */
      className="app-tile pointer-events-auto flex cursor-pointer items-center gap-2.5 py-2.5 pr-3.5 pl-2.5 shadow-md ring-neutral-950/[0.07] hover:ring-emerald-400/60"
    >
      <Cover work={work} size="xxs" />
      <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-700">
        <NotebookPen aria-hidden className="size-4 text-neutral-400" strokeWidth={1.75} />
        메모 남기기
      </span>
    </button>
  )
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/**
 * 펼쳐진 작성기. 열려 있을 때만 마운트한다 — 접었다 펴면 [useSwipeDismiss] 의 밀린 거리와
 * 흐려짐이 처음으로 돌아가야 하는데, 그 상태는 훅 안에 있어서 마운트가 살아 있으면 남는다.
 */
function Composer({ work, onClose }: { work: Work; onClose: () => void }) {
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
  const swipe = useSwipeDismiss(onClose)

  useEffect(() => {
    box.current?.focus()
  }, [])

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
    <div
      style={swipe.style}
      /*
        목업의 가로 배치 — 표지가 왼쪽에 서고 쓰는 자리가 오른쪽에 넓게 눕는다. 세로로
        긴 카드였을 때는 글 상자가 서랍만큼 좁아서, "빠르게 한 줄" 이 아니라 "좁은 데서
        참고 쓰기" 가 됐다. 폭은 화면이 좁으면 알아서 줄어든다.
      */
      /*
        relative: 아래 X 가 이 카드를 기준으로 앉아야 한다. 없으면 [FloatingStack] 의
        fixed 컨테이너가 기준이 되어, 카드가 아니라 스택 구석에 가서 붙는다.
        pointer-events-auto: 그 컨테이너는 빈 자리가 화면을 가로막지 않게 클릭을 통과시킨다
        — 안에 들어오는 것들이 각자 되살려야 눌린다.
      */
      className={`app-tile pointer-events-auto relative w-[min(44rem,calc(100vw-2rem))] shadow-xl ${
        swipe.dragging
          ? 'transition-none'
          : 'transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none'
      }`}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="app-button app-button-ghost app-icon-button absolute top-3 right-3 text-neutral-400"
      >
        <X aria-hidden className="size-4" strokeWidth={2} />
      </button>

      {/*
        좁은 화면에는 표지 칸을 세울 자리가 없다 — 어느 책인지만 한 줄로 얹는다.
        오른쪽 끝은 X 자리라 비워 둔다.
      */}
      <div {...swipe.handlers} className="flex items-center gap-2 px-4 pt-3.5 pr-12 sm:hidden">
        <Cover work={work} size="xxs" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-800">
          {work.title}
        </span>
      </div>

      <div className="flex items-stretch gap-5 p-4 sm:p-5">
        {/*
          표지와 제목은 누를 것이 없는 자리라, 손가락으로 미는 몸짓을 여기서 받는다 —
          칩이나 글 상자에 걸면 종류를 고르거나 글자를 짚으려다 카드가 끌려간다.
        */}
        <div {...swipe.handlers} className="hidden flex-none items-center gap-5 sm:flex">
          <div className="w-28">
            <Cover work={work} size="lg" />
          </div>
          {/* 제목 칸은 폭이 남을 때만. 없으면 표지가 그 자리를 대신한다 */}
          <div className="hidden w-32 flex-col md:flex">
            <h2 className="truncate text-xl font-semibold tracking-tight">{work.title}</h2>
            <p className="mt-0.5 truncate text-sm text-neutral-500">{work.author}</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* 서랍의 걸러 보는 칩과 같은 표를 본다([noteKind]) — 한 종류가 두 이름으로 안 불리게 */}
          <div className="flex flex-wrap gap-2 pr-10 sm:pr-0">
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
            <span className="hidden text-xs text-neutral-500 sm:inline">
              여기 적는 것은 나만 봅니다.
            </span>
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
