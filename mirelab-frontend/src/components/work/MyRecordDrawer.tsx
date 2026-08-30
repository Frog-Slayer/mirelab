import { useEffect, useState } from 'react'
import {
  Check,
  ChevronRight,
  LoaderCircle,
  Lock,
  NotebookPen,
  Plus,
  TriangleAlert,
  X,
} from 'lucide-react'
import WorkNoteCard from '@/components/work/WorkNoteCard'
import { NOTE_KIND_ORDER, noteKindEmpty, noteKindLabel } from '@/lib/noteKind'
import type { NoteKind, WorkNote } from '@/types'
import { NoteKind as Kind } from '@/types'

/**
 * 펼쳤을 때의 폭. 세 군데(자리를 잡는 겉, 폭이 줄었다 늘었다 하는 aside, 그 안에서 폭이
 * 고정돼야 하는 내용)가 같은 값을 써야 해서 한 곳에만 적어 둔다 — 하나만 어긋나면 여닫는
 * 동안 글이 접혔다 펴진다.
 *
 * RootLayout 이 <main> 오른쪽에 비워 두는 자리(xl:w-[28rem])와도 같은 값이어야 한다. 거기는
 * Tailwind 가 클래스를 미리 뽑아내야 해서 변수로 못 넘긴다 — 고칠 때 같이 고칠 것.
 */
const WIDTH = 'w-[min(28rem,100vw)]'
const SLIDE = 'transition-[width] duration-150 ease-out motion-reduce:transition-none'

/** 자동저장이 지금 어디까지 왔는지. 'idle' 은 아직 아무것도 안 쳤을 때 */
export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/**
 * 나만 보는 메모를 담는 자리. 좁은 화면에서는 오른쪽에서 겹쳐 뜨는 서랍이고, 화면이
 * 넓을 때(xl 이상)는 본문 옆에 자리를 차지하며 밀어내는 사이드바가 된다.
 *
 * 예전에는 스터디가 정해 둔 칸(내 요약·질문·토론거리…)이 섹션으로 서 있었다. 칸마다 값이
 * 하나씩이라 "메모 추가"가 애초에 안 됐고, 무엇을 어느 칸에 써야 하는지도 스터디가 정했다.
 * 지금은 종류가 셋(메모·질문·인용)뿐이고 각 종류에 얼마든지 쌓을 수 있다. 위의 칩은 섹션이
 * 아니라 걸러 보는 창이다 — 글은 종류에 매이지 않고, 쓴 뒤에 종류만 바꿔도 된다.
 *
 * 평점·한줄평은 여기 없다. 그건 스터디에 남는 기록이라 멤버별 평점 카드에서 매긴다.
 *
 * RootLayout 이 내준 자리(헤더 아래, main 옆)에 그린다 — 뷰포트 기준 fixed 지만 위쪽을
 * --header-h 로 잘라서, 헤더 위로 올라가거나 겹치는 일이 구조적으로 없다.
 */
export default function MyRecordDrawer({
  open,
  notes,
  draftKeyPrefix,
  saveState,
  onAddNote,
  onSaveNoteBody,
  onChangeNoteKind,
  onRemoveNote,
  onToggle,
}: {
  open: boolean
  notes: WorkNote[]
  /** 아직 못 보낸 글을 브라우저에 맡길 때 쓰는 이름표의 앞부분(작품·사람) */
  draftKeyPrefix: string
  saveState: SaveState
  /** 만들어진 메모의 id 를 돌려주면 그 칸에 곧바로 초점이 간다 */
  onAddNote: (kind: NoteKind) => Promise<string | undefined>
  /** 저장이 끝나는 때를 알 수 있게 약속(Promise)을 돌려주면, 저장들이 순서대로 나간다 */
  onSaveNoteBody: (noteId: string, body: string) => void | Promise<unknown>
  onChangeNoteKind: (noteId: string, kind: NoteKind) => void
  onRemoveNote: (noteId: string) => void
  onToggle: () => void
}) {
  /** 방금 만든 메모 — 그 칸에만 초점을 준다. 목록을 다시 받아와도 한 번만 쓰인다 */
  const [justAdded, setJustAdded] = useState<string | null>(null)

  /**
   * 지금 보고 있는 종류. 한 번에 한 종류만 보여주는 이유는 서랍이 좁아서다 — 메모·질문·인용을
   * 한 줄기로 섞어 놓으면 "질문 세 개가 뭐였더라" 를 찾느라 스무 장을 굴려야 한다.
   *
   * 추가 버튼도 이 값을 따른다. 무엇을 쓸지 먼저 고른 뒤 쓰는 것이라, 만들 때 종류를 또
   * 고르게 하면 같은 선택을 두 번 하는 셈이다(잘못 골랐으면 카드에서 바꿀 수 있다).
   */
  const [kind, setKind] = useState<NoteKind>(Kind.MEMO)

  const counts = {
    [Kind.MEMO]: 0,
    [Kind.QUESTION]: 0,
    [Kind.QUOTE]: 0,
  }
  for (const note of notes) counts[note.kind] += 1
  const shown = notes.filter((note) => note.kind === kind)

  const add = async (kind: NoteKind) => {
    const id = await onAddNote(kind)
    if (id) setJustAdded(id)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open && e.key === 'Escape') onToggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onToggle])

  const width = open ? WIDTH : 'w-0'

  return (
    <>
      {/*
        xl 미만에서는 서랍이 본문 위를 덮는다. 그때는 덮인 곳을 눌러서 닫을 수 있어야 한다 —
        안 그러면 손잡이를 다시 찾아 누르는 수밖에 없다. xl 이상에서는 본문을 밀어내고 나란히
        서므로 덮개가 필요 없다(있으면 읽고 있던 본문이 괜히 어두워진다).
      */}
      {open && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={onToggle}
          className="fixed inset-x-0 top-[var(--header-h)] bottom-0 z-30 cursor-default bg-neutral-950/20 xl:hidden"
        />
      )}

      <div
        className={`fixed top-[var(--header-h)] right-0 bottom-0 z-40 flex-none overflow-visible ${SLIDE} ${width}`}
      >
        {/*
          손잡이. 예전에는 서랍 모서리를 위아래로 가로지르는 24px 짜리 띠였는데, 닫혀 있을
          때는 화면 끝에 붙은 긴 막대로만 보여서 무엇에 딸린 것인지 알 수 없었다.
          세로 가운데의 작은 탭으로 줄이고, 닫혀 있을 때만 이름을 세로로 적는다.
        */}
        <button
          type="button"
          onClick={onToggle}
          aria-label={open ? '내 메모 닫기' : '내 메모 열기'}
          className="absolute top-1/2 -left-8 z-10 flex w-8 -translate-y-1/2 cursor-pointer flex-col items-center gap-2 rounded-l-xl bg-white py-4 text-neutral-500 shadow-[-3px_0_10px_rgb(15_23_42/0.07)] ring-1 ring-neutral-950/[0.07] transition-colors hover:bg-emerald-50 hover:text-emerald-700"
        >
          {open ? (
            <ChevronRight aria-hidden className="size-4" strokeWidth={2} />
          ) : (
            <>
              <NotebookPen aria-hidden className="size-4" strokeWidth={1.75} />
              {/* 폭이 32px 뿐이라 가로로는 두 글자도 못 넣는다 — 글줄을 세로로 세운다 */}
              <span
                aria-hidden
                className="text-xs font-medium [writing-mode:vertical-rl] whitespace-nowrap"
              >
                내 메모
              </span>
            </>
          )}
        </button>

        <aside
          className={`h-full overflow-hidden rounded-l-2xl bg-white shadow-[-4px_0_24px_rgb(15_23_42/0.08)] ring-1 ring-neutral-950/[0.07] ${SLIDE} ${width}`}
        >
          {/* 여닫히는 동안 안쪽 폭은 고정 — 안 그러면 글이 접혔다 펴지는 게 보인다 */}
          <div className={`flex h-full flex-col ${WIDTH}`}>
            {/*
              머리 부분은 굴러가지 않는다 — 메모가 길게 쌓여도 종류를 바꾸거나 하나 더
              만드는 일은 늘 같은 자리에 있어야 한다.
            */}
            <div className="flex flex-none flex-col gap-3 px-5 pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Lock aria-hidden className="size-4 text-neutral-400" strokeWidth={2} />
                <h2 className="text-base font-semibold">내 메모</h2>
                <SaveBadge state={saveState} />
                <button
                  type="button"
                  onClick={onToggle}
                  aria-label="내 메모 닫기"
                  className="app-button app-button-ghost app-icon-button ml-auto text-neutral-400"
                >
                  <X aria-hidden className="size-4" strokeWidth={2} />
                </button>
              </div>

              {/* 자물쇠만으로는 "무엇이 비공개인지" 가 안 읽힌다 — 한 줄로 못 박아 둔다 */}
              <p className="-mt-1.5 text-xs text-neutral-500">여기 적는 것은 나만 봅니다.</p>

              <div className="flex gap-1.5">
                {NOTE_KIND_ORDER.map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={k === kind}
                    onClick={() => setKind(k)}
                    className={`app-pill flex-1 justify-center px-0 text-xs ${
                      k === kind
                        ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/30 hover:bg-emerald-50 hover:text-emerald-800 hover:ring-emerald-600/30'
                        : ''
                    }`}
                  >
                    {noteKindLabel[k]}
                    <span className={k === kind ? 'text-emerald-700/70' : 'text-neutral-400'}>
                      {counts[k]}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void add(kind)}
                className="app-button app-button-primary w-full"
              >
                <Plus aria-hidden className="size-4" strokeWidth={2} />
                {noteKindLabel[kind]} 추가
              </button>
            </div>

            {/* min-h-0 이 없으면 flex 자식이 내용보다 작아지지 못해 스크롤이 아예 안 생긴다 */}
            <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain px-5 pt-1 pb-5">
              {shown.map((note) => (
                <WorkNoteCard
                  key={note.id}
                  note={note}
                  draftKey={`${draftKeyPrefix}:${note.id}`}
                  autoFocus={note.id === justAdded}
                  onSaveBody={(body) => onSaveNoteBody(note.id, body)}
                  onChangeKind={(next) => onChangeNoteKind(note.id, next)}
                  onRemove={() => onRemoveNote(note.id)}
                />
              ))}

              {shown.length === 0 && (
                <p className="py-6 text-center text-sm text-neutral-500">{noteKindEmpty[kind]}</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}

/**
 * 저장 버튼이 없는 자리라, 지금 무슨 일이 벌어지는지는 여기서만 알 수 있다. 실패는 색으로도
 * 알린다 — 나머지 둘은 지나가는 소식이지만 이건 사람이 손을 써야 하는 소식이다.
 *
 * aria-live 로 두는 이유: 눈으로 보고 있지 않아도(에디터에 초점이 가 있다) 저장 실패는
 * 전해져야 한다.
 */
function SaveBadge({ state }: { state: SaveState }) {
  if (state === 'idle') return null

  const { Icon, label, tone, spin } = {
    saving: { Icon: LoaderCircle, label: '저장 중', tone: 'text-neutral-400', spin: true },
    saved: { Icon: Check, label: '저장됨', tone: 'text-neutral-400', spin: false },
    error: { Icon: TriangleAlert, label: '저장 실패', tone: 'text-rose-600', spin: false },
  }[state]

  return (
    <span aria-live="polite" className={`flex items-center gap-1 text-xs ${tone}`}>
      <Icon
        aria-hidden
        className={`size-3.5 ${spin ? 'animate-spin motion-reduce:animate-none' : ''}`}
        strokeWidth={2}
      />
      {label}
    </span>
  )
}
