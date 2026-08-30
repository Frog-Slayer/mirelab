import { useRef } from 'react'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import NoteBody from '@/components/work/NoteBody'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NOTE_KIND_ORDER, noteKindLabel, noteKindPlaceholder, noteKindTone } from '@/lib/noteKind'
import type { NoteKind, WorkNote } from '@/types'
import { NoteKind as Kind } from '@/types'

/** 카드 머리의 날짜. 시각까지 적을 자리도 아니고, 알아야 하는 건 "언제쯤 적었나" 뿐이다 */
function writtenOn(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}

/**
 * 메모 한 장.
 *
 * 머리줄(종류 배지 · 날짜 · 메뉴)과 본문 사이에 선을 긋지 않는다 — 카드 테두리가 이미
 * 경계라, 안에 선을 한 겹 더 넣으면 메모장이 아니라 표처럼 읽힌다. 층은 글자 크기와
 * 색으로만 낸다: 머리줄은 작고 옅게, 본문은 보통 크기로.
 */
export default function WorkNoteCard({
  note,
  draftKey,
  autoFocus,
  onSaveBody,
  onChangeKind,
  onRemove,
}: {
  note: WorkNote
  draftKey: string
  /** 방금 만들어진 메모 — 만들자마자 쓸 수 있게 */
  autoFocus: boolean
  onSaveBody: (body: string) => void | Promise<unknown>
  onChangeKind: (kind: NoteKind) => void
  onRemove: () => void
}) {
  /**
   * 지금 쳐 넣은 글. 빈 메모를 거두는 판단에만 쓰므로 state 가 아니라 ref 다 —
   * state 로 두면 글자 하나마다 카드가 통째로 다시 그려진다.
   */
  const typed = useRef(note.body)
  /**
   * 메뉴가 열려 있는지. state 가 아니라 ref 인 이유는 아래 [collectIfEmpty] 가 읽기
   * 때문이다 — 그 함수는 초점이 빠져나가던 순간의 값을 붙든 채 다음 틱에 깨어나므로,
   * 그 사이에 열린 메뉴를 state 로는 볼 수 없다.
   */
  const menuOpen = useRef(false)

  /**
   * 아무것도 안 쓴 메모는 자리를 뜰 때 조용히 거둔다. 눌러만 보고 떠난 빈 카드가 쌓이면
   * 서랍이 금세 지저분해지는데, 그걸 사람이 하나씩 지우게 할 일은 아니다.
   *
   * 곧바로 판정하지 않는 이유가 셋이다 — 초점이 옮겨간 곳은 다음 틱에야 정해지고,
   * 탭을 바꾼 것(document.hasFocus())은 자리를 뜬 게 아니며, 종류를 고르는 메뉴는
   * 포털이라 이 카드 바깥에 그려진다(그리로 초점이 가도 자리를 뜬 게 아니다).
   */
  const card = useRef<HTMLDivElement>(null)
  const collectIfEmpty = () => {
    setTimeout(() => {
      if (menuOpen.current || !document.hasFocus()) return
      if (card.current?.contains(document.activeElement)) return
      if (typed.current.trim() === '') onRemove()
    })
  }

  return (
    <div
      ref={card}
      onBlur={collectIfEmpty}
      /* flex-none: 굴러가는 목록 안에서 카드가 눌려 글이 잘리지 않게 */
      className="app-tile flex-none p-4 focus-within:ring-neutral-950/15"
    >
      <div className="flex items-center gap-2">
        <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${noteKindTone[note.kind]}`}>
          {noteKindLabel[note.kind]}
        </span>

        <time dateTime={note.createdAt} className="ml-auto text-xs text-neutral-400">
          {writtenOn(note.createdAt)}
        </time>

        <DropdownMenu
          onOpenChange={(open) => {
            menuOpen.current = open
          }}
        >
          <DropdownMenuTrigger
            aria-label={`${noteKindLabel[note.kind]} 다루기`}
            /* 늘 보이되 아주 옅게 — 손가락으로 쓰는 화면에는 hover 가 없다 */
            className="app-icon-button -mr-1.5 size-6 cursor-pointer text-neutral-300 transition-colors outline-none hover:text-neutral-600 focus-visible:text-neutral-600 data-[state=open]:text-neutral-600"
          >
            <MoreHorizontal aria-hidden className="size-4" strokeWidth={2} />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuRadioGroup
              value={note.kind}
              onValueChange={(next) => onChangeKind(next as NoteKind)}
            >
              {NOTE_KIND_ORDER.map((kind) => (
                <DropdownMenuRadioItem key={kind} value={kind}>
                  {noteKindLabel[kind]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onRemove}>
              <Trash2 aria-hidden className="size-3.5" strokeWidth={2} />
              지우기
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 옮겨 적은 문장은 내 말이 아니다 — 기울여 두면 배지를 안 보고도 구분된다 */}
      <div className={`mt-1.5 ${note.kind === Kind.QUOTE ? 'text-neutral-600 italic' : ''}`}>
        <NoteBody
          value={note.body}
          placeholder={noteKindPlaceholder[note.kind]}
          draftKey={draftKey}
          autoFocus={autoFocus}
          onSave={onSaveBody}
          onTextChange={(text) => {
            typed.current = text
          }}
        />
      </div>
    </div>
  )
}
