import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { NotebookPen, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import Cover from '@/components/Cover'
import { FloatingAction } from '@/components/layout/FloatingStack'
import NoteForm from '@/components/work/NoteForm'
import { COMPACT_QUERY, useMediaQuery } from '@/hooks/useMediaQuery'
import { useSheetSwipe } from '@/hooks/useSheetSwipe'
import { formatDday, formatMeetAt } from '@/lib/format'
import { getCurrentSession } from '@/lib/scheduleApi'
import { ONE_DAY_MS, isSnoozed, snooze } from '@/lib/snoozeStore'
import type { Session, Study, Work } from '@/types'

/**
 * 화면 아래에 사는 것 — 지금 읽는 책의 광고와, 그 책에 메모 한 장을 던져 넣는 자리.
 *
 * 셋이 아니라 **한 줄기의 세 모습**이다.
 *
 * ```
 *   광고 띠  ──(닫기·아래로 밀기)──▶  메모 알약  ──(누르기)──▶  작성기
 *      └───────────(위로 끌어올리기, 좁은 화면)───────────────────┘
 * ```
 *
 * 한 컴포넌트에 모아 둔 이유가 그 화살표다. 전에는 광고와 알약이 서로를 모른 채 각자
 * 화면 아래 오른쪽을 잡으려 해서, 광고가 뒤를 막지 않게 되는 순간 둘이 겹쳤다.
 *
 * **좁은 화면에서는 광고와 작성기가 한 시트로 이어붙는다.** 위로 끌어올리면 광고가
 * 사라지고 딴 게 뜨는 게 아니라, 그 아래로 쓰는 자리가 자라난다 — 무엇에 대한 메모인지가
 * 손가락을 떼는 순간에도 계속 보인다. 넓은 화면에서는 그 몸짓이 없으므로(손잡이를 안
 * 그린다) 광고는 가운데 아래, 알약과 작성기는 오른쪽 아래에 따로 선다.
 *
 * 그 책의 상세를 보고 있는 동안에는 통째로 안 뜬다 — "내 메모" 서랍([MyRecordDrawer])이
 * 바로 옆에 있는데 쓰는 문을 하나 더 두면, 방금 적은 것이 어느 쪽에 있는지 헷갈린다.
 * 광고도 마찬가지다: 이미 그 책 앞에 서 있는 사람에게 그 책을 광고할 것이 없다.
 */
export default function CurrentBookDock({
  study,
  onHeightChange,
}: {
  study: Study | null
  /** 바닥에 눕는 것의 높이(px). [FloatingStack] 이 그만큼 올라선다 */
  onHeightChange: (height: number) => void
}) {
  const { pathname } = useLocation()
  const compact = useMediaQuery(COMPACT_QUERY)
  /** 이번 화면에서 닫은 광고 */
  const [closedAdId, setClosedAdId] = useState<string | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)

  const { data: current } = useQuery({
    queryKey: ['currentSession', study?.slug],
    queryFn: () => getCurrentSession(study!.slug),
    enabled: !!study,
  })

  // 화면을 옮길 때마다 localStorage 를 다시 읽지 않는다 — 모임이 바뀔 때만 물어보면 된다.
  const sessionId = current?.session.id ?? null
  const snoozed = useMemo(() => (sessionId ? isSnoozed(adKey(sessionId)) : false), [sessionId])

  if (!study || !current?.work) return null

  const { session, work } = current
  if (pathname.startsWith(`/${study.slug}/books/${work.id}`)) return null

  const adOpen = !snoozed && closedAdId !== session.id
  const closeAd = () => setClosedAdId(session.id)

  if (compact) {
    if (!adOpen && !noteOpen) {
      return (
        <FloatingAction>
          <Pill work={work} onOpen={() => setNoteOpen(true)} />
        </FloatingAction>
      )
    }
    return (
      <CompactSheet
        session={session}
        work={work}
        studySlug={study.slug}
        adOpen={adOpen}
        noteOpen={noteOpen}
        onHeightChange={onHeightChange}
        onOpenNote={() => setNoteOpen(true)}
        onCloseNote={() => setNoteOpen(false)}
        onCloseAd={closeAd}
        onSnoozeAd={() => {
          snooze(adKey(session.id), ONE_DAY_MS)
          closeAd()
        }}
      />
    )
  }

  return (
    <>
      {adOpen && (
        <WideAd
          session={session}
          work={work}
          studySlug={study.slug}
          onHeightChange={onHeightChange}
          onClose={closeAd}
          onSnooze={() => {
            snooze(adKey(session.id), ONE_DAY_MS)
            closeAd()
          }}
        />
      )}
      {/* 광고가 떠 있는 동안은 알약을 접어둔다 — 같은 책을 두고 둘이 동시에 말을 건다 */}
      {!adOpen && (
        <FloatingAction>
          {noteOpen ? (
            <WideComposer work={work} onClose={() => setNoteOpen(false)} />
          ) : (
            <Pill work={work} onOpen={() => setNoteOpen(true)} />
          )}
        </FloatingAction>
      )}
    </>
  )
}

function adKey(sessionId: string) {
  return `session-ad:${sessionId}`
}

/* ------------------------------------------------------------------ 좁은 화면 */

/**
 * 광고와 작성기가 이어붙는 한 장의 시트. 화면 바닥에 붙어서 위로만 자란다.
 *
 * 손잡이는 광고가 접혀 있을 때만 있다 — 위로 끌어올려 작성기를 여는 길을 알려주는
 * 표식이다. 작성기가 열린 뒤에는 쓰는 자리를 괜히 한 줄 밀어내므로 사라진다.
 *
 * 작성기는 다른 판으로 갈아끼우지 않는다. 광고 머리줄 아래에 늘 이어져 있고, 닫혀 있을
 * 때만 높이를 0으로 접어 둔다. 그래서 위로 밀면 광고 판 자체가 쓰는 자리만큼 자라난다.
 */
function CompactSheet({
  session,
  work,
  studySlug,
  adOpen,
  noteOpen,
  onHeightChange,
  onOpenNote,
  onCloseNote,
  onCloseAd,
  onSnoozeAd,
}: {
  session: Session
  work: Work
  studySlug: string
  adOpen: boolean
  noteOpen: boolean
  onHeightChange: (height: number) => void
  onOpenNote: () => void
  onCloseNote: () => void
  onCloseAd: () => void
  onSnoozeAd: () => void
}) {
  const navigate = useNavigate()
  /** 작성기에서 닫으면 광고로 되돌아가지 않고, 둘을 함께 접어 메모 알약만 남긴다 */
  const closeSheet = () => {
    if (noteOpen) onCloseNote()
    onCloseAd()
  }
  const swipe = useSheetSwipe({
    onUp: noteOpen ? undefined : onOpenNote,
    onDown: onCloseAd,
  })

  useEscape(closeSheet)

  return (
    <BottomSheet
      onHeightChange={onHeightChange}
      style={swipe.style}
      dragging={swipe.dragging}
      className="w-full"
    >
      {/*
        손잡이 자리는 높이를 그대로 두고 표식만 스와이프와 함께 사라진다. 임계점에서 DOM 을
        통째로 빼면 작성기가 열린 직후 시트가 한 번 더 위아래로 튀기 때문이다.
      */}
      <div
        {...(noteOpen ? {} : swipe.handlers)}
        aria-hidden={noteOpen}
        className="flex h-5 justify-center pt-2"
      >
        <span
          aria-hidden
          style={{ opacity: noteOpen ? 0 : 1 - swipe.expandProgress }}
          className={`h-1 w-9 rounded-full bg-neutral-300 transition-opacity duration-200 motion-reduce:transition-none ${
            swipe.dragging ? 'transition-none' : ''
          }`}
        />
      </div>

      {/*
        접혀 있을 때는 띠 전체가 손잡이다 — 폭이 이만한데 몸짓을 8px 짜리 막대에만 걸어
        두면 끌리는 자리를 겨냥해야 한다. 안의 버튼들은 그대로 눌린다: 실제로 민 뒤에만
        뒤따르는 click 한 번을 삼킨다([useSheetSwipe]).

        작성기가 열리면 몸짓을 받지 않는다. 글 상자와 칩에서 글자를 짚거나 종류를
        고르려다 시트가 끌리는 일이 없어야 하고, 그 상태에는 손잡이도 없다.
      */}
      <div
        {...(noteOpen ? {} : swipe.handlers)}
        className="relative px-5 pb-3"
      >
        <button
          type="button"
          onClick={closeSheet}
          aria-label="닫기"
          className="app-button app-button-ghost app-icon-button absolute -top-1 right-4 text-neutral-400"
        >
          <X aria-hidden className="size-4" strokeWidth={2} />
        </button>

        {/*
          작성기가 열려 있어도 이 줄은 그대로 남는다 — 무엇에 대한 메모인지가 쓰는 내내
          보여야 한다. 다만 그때는 누르는 줄이 아니게 둔다([BookRow] 주석), 그리고 광고를
          이미 닫은 뒤 알약에서 연 경우에는 '하루 동안 보지 않기' 도 안 붙인다. 닫아 없앤
          권유가 메모를 쓰겠다고 다시 살아나면 닫은 것이 무슨 뜻이었나 싶다.
        */}
        <BookRow
          session={session}
          work={work}
          compact
          onGo={
            noteOpen
              ? undefined
              : () => {
                  onCloseAd()
                  navigate(`/${studySlug}/books/${work.id}`)
                }
          }
        />

        {adOpen && (
          <div
            aria-hidden={noteOpen}
            inert={noteOpen}
            style={
              !noteOpen && swipe.expandProgress > 0
                ? {
                    gridTemplateRows: `${1 - swipe.expandProgress}fr`,
                    marginTop: `${(1 - swipe.expandProgress) * 0.25}rem`,
                    opacity: 1 - swipe.expandProgress,
                  }
                : undefined
            }
            className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out motion-reduce:transition-none ${
              swipe.dragging ? 'transition-none' : ''
            } ${noteOpen ? 'mt-0 grid-rows-[0fr] opacity-0' : 'mt-1 grid-rows-[1fr] opacity-100'}`}
          >
            <div className="flex min-h-0 justify-end overflow-hidden">
              <SnoozeLink onSnooze={onSnoozeAd} />
            </div>
          </div>
        )}

        {/*
          작성기를 조건부로 새로 붙이지 않는다. 같은 시트 안에서 0fr → 1fr 로 높이를
          열어, 광고가 통째로 위로 자라는 것처럼 보이게 한다. 닫힌 동안 inert 로 두는 건
          눈에 안 보이는 칩과 글 상자가 키보드 탭 순서에 잡히지 않게 하기 위해서다.
        */}
        <div
          aria-hidden={!noteOpen}
          inert={!noteOpen}
          style={
            !noteOpen && swipe.expandProgress > 0
              ? {
                  gridTemplateRows: `${swipe.expandProgress}fr`,
                  marginTop: `${swipe.expandProgress * 0.75}rem`,
                  opacity: swipe.expandProgress,
                }
              : undefined
          }
          className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out motion-reduce:transition-none ${
            swipe.dragging ? 'transition-none' : ''
          } ${
            noteOpen ? 'mt-3 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="border-t border-neutral-100 pt-3">
              <NoteForm work={work} autoFocus={noteOpen} />
            </div>
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------ 넓은 화면 */

/** 가운데 아래에 눕는 광고 띠. 여기엔 손잡이가 없다 — 손가락으로 여닫는 길은 좁은 화면 것이다 */
function WideAd({
  session,
  work,
  studySlug,
  onHeightChange,
  onClose,
  onSnooze,
}: {
  session: Session
  work: Work
  studySlug: string
  onHeightChange: (height: number) => void
  onClose: () => void
  onSnooze: () => void
}) {
  const navigate = useNavigate()
  useEscape(onClose)

  return (
    <BottomSheet onHeightChange={onHeightChange} className="w-[min(72rem,100vw)]">
      <div className="relative px-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="app-button app-button-ghost app-icon-button absolute top-2 right-5 text-neutral-400"
        >
          <X aria-hidden className="size-4" strokeWidth={2} />
        </button>

        <div className="flex items-center gap-x-6 py-3">
          <BookRow
            session={session}
            work={work}
            onGo={() => {
              onClose()
              navigate(`/${studySlug}/books/${work.id}`)
            }}
          />
          {/* 닫기 X 아래로 파고들지 않게 오른쪽 끝을 조금 비운다 */}
          <SnoozeLink onSnooze={onSnooze} className="mt-5" />
        </div>
      </div>
    </BottomSheet>
  )
}

/**
 * 오른쪽 아래 카드. 표지가 왼쪽에 서고 쓰는 자리가 오른쪽에 넓게 눕는다 — 세로로 긴
 * 카드였을 때는 글 상자가 서랍만큼 좁아서 "빠르게 한 줄" 이 아니라 "좁은 데서 참고 쓰기"
 * 가 됐다.
 */
function WideComposer({ work, onClose }: { work: Work; onClose: () => void }) {
  useEscape(onClose)

  return (
    <div className="app-tile pointer-events-auto relative w-[min(44rem,calc(100vw-2rem))] shadow-xl">
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="app-button app-button-ghost app-icon-button absolute top-3 right-3 text-neutral-400"
      >
        <X aria-hidden className="size-4" strokeWidth={2} />
      </button>

      <div className="flex items-stretch gap-5 p-5">
        <div className="flex flex-none items-center gap-5">
          <div className="w-28">
            <Cover work={work} size="lg" />
          </div>
          {/* 제목 칸은 폭이 남을 때만. 없으면 표지가 그 자리를 대신한다 */}
          <div className="hidden w-32 flex-col md:flex">
            <h2 className="truncate text-xl font-semibold tracking-tight">{work.title}</h2>
            <p className="mt-0.5 truncate text-sm text-neutral-500">{work.author}</p>
          </div>
        </div>

        <NoteForm work={work} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ 조각들 */

/** 접혀 있을 때의 모습. 표지를 달고 있어 어느 책에 쓰는지가 누르기 전에 보인다 */
function Pill({ work, onOpen }: { work: Work; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
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

/**
 * 표지 · D-day · 제목 · 저자와 일시. 광고든 작성기든 머리에는 늘 이 줄이 선다.
 *
 * `onGo` 를 주면 줄 전체가 그 책으로 가는 버튼이 된다 — 따로 '기록하러 가기' 를 두지
 * 않는 이유다. 띠가 통째로 그 책을 가리키고 있는데 그 안에 다시 "그 책으로" 라는 버튼을
 * 두면, 띠의 나머지 부분은 누르면 안 되는 것처럼 보인다.
 *
 * 작성기가 열려 있는 동안에는 안 준다. 쓰는 중에 머리줄을 잘못 건드려 화면이 떠나면
 * 방금 치던 글이 어디 갔나 싶다(초안은 남지만, 남는다는 걸 그 순간엔 알 수 없다).
 */
function BookRow({
  session,
  work,
  compact = false,
  onGo,
}: {
  session: Session
  work: Work
  compact?: boolean
  onGo?: () => void
}) {
  const content = (
    <>
      <div className={`flex-none ${compact ? 'w-12' : 'w-14'}`}>
        <Cover work={work} size="lg" />
      </div>

      {/* pr-8: 오른쪽 위 닫기 자리를 비워 둔다 — 제목이 길면 그 밑으로 파고든다 */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pr-8 text-left">
        <div className="flex min-w-0 items-center gap-2">
          {/* D-day 를 제목 옆에 붙여 한 줄을 아낀다 — 띠는 낮을수록 안 거슬린다 */}
          <span className="flex-none rounded-full bg-[#245445] px-2 py-0.5 text-[11px] font-medium text-white">
            {formatDday(session.meetAt) ?? '날짜 미정'}
          </span>
          <h2 className="truncate font-serif text-lg font-semibold tracking-[-0.02em] sm:text-xl">
            {work.title}
          </h2>
        </div>
        {/*
          날짜가 없으면 여기서는 아예 뺀다 — [formatMeetAt] 도 '날짜 미정' 을 돌려주는데
          그건 위 배지가 이미 하는 말이라, 같은 문장이 두 줄에 걸쳐 두 번 적힌다.
        */}
        <p className="truncate text-xs text-neutral-500">
          {work.author}
          {session.meetAt && ` · ${formatMeetAt(session.meetAt)}`}
        </p>
      </div>

    </>
  )

  if (!onGo) return <div className="flex min-w-0 flex-1 items-center gap-3.5">{content}</div>

  return (
    <button
      type="button"
      onClick={onGo}
      className="group flex min-w-0 flex-1 cursor-pointer items-center gap-3.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/25"
    >
      {content}
    </button>
  )
}

/**
 * 광고에만 붙는 곁가지. 그냥 닫는 버튼은 두지 않는다 — 오른쪽 위 X 와 하는 일이 똑같아서,
 * 나란히 두면 둘이 서로 다른 일을 하는 줄 알고 읽게 된다. 여기 남는 건 X 로는 못 하는
 * 것뿐이다.
 */
function SnoozeLink({ onSnooze, className = '' }: { onSnooze: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onSnooze}
      className={`flex-none cursor-pointer py-1 text-xs whitespace-nowrap text-neutral-500 hover:text-neutral-900 ${className}`}
    >
      하루 동안 보지 않기
    </button>
  )
}

/**
 * 바닥에 붙어 위로 자라는 판. 아래 모서리는 안 둥글린다 — 화면 밖으로 이어지는 자리라
 * 둥글리면 거기서 잘린 것처럼 보인다. 그림자도 위로만 떨어뜨린다.
 *
 * 뒤를 막지 않는다. 바깥 겹은 클릭을 통과시키고([FloatingStack] 과 같은 방식) 판만
 * 되살린다 — 판 양옆의 빈자리가 그 아래 화면을 가로막으면 안 막는 광고로 만든 뜻이 없다.
 */
function BottomSheet({
  children,
  className,
  style,
  dragging = false,
  onHeightChange,
}: {
  children: ReactNode
  className: string
  style?: CSSProperties
  dragging?: boolean
  onHeightChange: (height: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  // 높이는 내용에 따라 달라진다(작성기가 자라난다) — 재서 올려보낸다. [RootLayout] 이
  // 헤더 높이를 다루는 방식과 같다. 사라질 때 0 으로 되돌리는 것까지 여기 묶어둔다.
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new ResizeObserver(([entry]) => onHeightChange(entry.contentRect.height))
    observer.observe(el)
    return () => {
      observer.disconnect()
      onHeightChange(0)
    }
  }, [onHeightChange])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center">
      <div
        ref={ref}
        style={{ ...style, transition: dragging ? 'none' : undefined }}
        className={`pointer-events-auto animate-[slide-up_260ms_ease-out] rounded-t-3xl bg-white shadow-[0_-8px_30px_rgb(15_23_42/0.12)] ring-1 ring-neutral-950/[0.07] transition-[transform,opacity] duration-200 ease-out motion-reduce:animate-none motion-reduce:transition-none ${className}`}
      >
        {children}
      </div>
    </div>
  )
}

/** 바닥에 눕는 것들은 <dialog> 가 아니라 그냥 얹힌 판이라, Esc 는 직접 듣는다 */
function useEscape(onEscape: () => void) {
  const ref = useRef(onEscape)
  ref.current = onEscape

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') ref.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
