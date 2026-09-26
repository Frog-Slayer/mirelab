import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { useDebouncedSave } from '@/hooks/useDebouncedSave'
import { clearDraft, readDraft, writeDraft } from '@/lib/draftStore'

/**
 * 메모 한 장의 본문. 예전에는 여기도 BlockNote 였는데, 448px 짜리 서랍 안에서 슬래시
 * 메뉴·드래그 핸들·서식 도구까지 딸려 오는 건 과했다. 남기는 게 몇 줄짜리 메모라면 글
 * 상자 하나면 된다 — 진짜 문서를 쓰는 자리(내 서재의 개인 노트, 블로그 글)는 그대로 둔다.
 *
 * `draftKey` 를 주면 치는 대로 브라우저에도 사본을 남긴다([draftStore]). 서버에 들어간 게
 * 확인되면 지우고, 못 들어간 채로 탭이 닫혔으면 다음에 열 때 되살릴지 묻는다.
 */
export default function NoteBody({
  value,
  placeholder,
  draftKey,
  autoFocus = false,
  onSave,
  onTextChange,
}: {
  value: string
  placeholder?: string
  /** 이 메모를 가리키는 이름(작품·사람·메모). 안 주면 사본을 남기지 않는다 */
  draftKey?: string
  /** 방금 만들어진 메모는 곧바로 쓸 수 있어야 한다 */
  autoFocus?: boolean
  onSave: (body: string) => void | Promise<unknown>
  /**
   * 저장과 무관하게, 지금 화면에 있는 글을 곧바로 알린다 — 빈 메모를 거두는 쪽
   * ([WorkNoteCard])은 디바운스가 끝나기 전에도 지금 글이 비었는지 알아야 한다.
   */
  onTextChange?: (body: string) => void
}) {
  /**
   * 화면에 지금 있는 글. 저장이 끝났을 때 "그새 더 쳤는지" 를 가리는 데 쓴다 —
   * 방금 보낸 것보다 새 글자가 있으면 사본을 지우면 안 된다.
   */
  const latest = useRef(value)

  const [text, setText] = useDebouncedSave(value, (next) => {
    const result = onSave(next)
    return Promise.resolve(result).then(() => {
      if (draftKey && latest.current === next) clearDraft(draftKey)
    })
  })
  latest.current = text

  /**
   * 되살릴 수 있는 사본. 서버 값과 같으면 되살릴 게 없는 것이므로 안 묻는다 —
   * 저장까지 잘 끝난 뒤 사본만 미처 못 지운 경우가 그렇다.
   */
  const [recoverable, setRecoverable] = useState(() => {
    if (!draftKey) return null
    const saved = readDraft(draftKey)
    return saved !== null && saved !== value ? saved : null
  })

  const change = (next: string) => {
    setText(next)
    onTextChange?.(next)
    // 저장 요청을 기다리지 않고 바로 적는다 — 사본이 막아야 하는 건 저장이 나가기 전에
    // 탭이 닫히는 경우다. 디바운스를 같이 태우면 그 구간이 그대로 구멍이 된다.
    if (draftKey) writeDraft(draftKey, next)
  }

  /**
   * 글이 길어지는 만큼 상자도 자란다 — 좁은 서랍 안에서 안쪽 스크롤이 하나 더 생기면
   * 어느 것을 굴리고 있는지 헷갈린다.
   *
   * 높이를 auto 로 한 번 풀었다가 scrollHeight 로 다시 잡는 이유: 지금 높이를 그대로 둔
   * 채로는 scrollHeight 가 그 높이 아래로 안 내려가서, 글을 지워도 상자가 안 줄어든다.
   *
   * useLayoutEffect 인 이유: 그려진 뒤에 고치면 한 프레임 동안 옛 높이가 보여 덜컥거린다.
   */
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [text])

  /**
   * 방금 만들어진 메모로 초점을 옮긴다. `autoFocus` 속성을 쓰지 않는 이유: 그건 그려지는
   * 순간에만 듣는데, 새 메모는 서버가 id 를 준 **뒤에** 목록에 나타나므로 이 카드가 이미
   * 그려진 다음에 "네가 방금 만들어진 것" 이라는 소식이 오는 경우가 있다.
   */
  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])

  return (
    <div className="flex flex-col gap-2">
      {recoverable !== null && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
          <span className="flex items-center gap-1.5">
            <TriangleAlert aria-hidden className="size-3.5 flex-none" strokeWidth={2} />
            저장하지 못한 메모가 남아 있어요.
          </span>
          <span className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                change(recoverable)
                setRecoverable(null)
              }}
              className="cursor-pointer font-medium underline decoration-amber-400 underline-offset-2 hover:decoration-amber-700"
            >
              되살리기
            </button>
            <button
              type="button"
              onClick={() => {
                if (draftKey) clearDraft(draftKey)
                setRecoverable(null)
              }}
              className="cursor-pointer text-amber-700/70 hover:text-amber-900"
            >
              버리기
            </button>
          </span>
        </div>
      )}

      <textarea
        ref={ref}
        value={text}
        onChange={(event) => change(event.target.value)}
        placeholder={placeholder}
        rows={1}
        /*
          테두리도 배경도 없다 — 카드 자체가 이미 경계라, 상자를 한 겹 더 그리면 서랍이
          입력 양식처럼 보인다. 종류를 알아보는 건 왼쪽 표시가 맡는다([WorkNoteCard]).
          크기 조절 손잡이는 끈다: 높이는 글이 정한다.
        */
        className="w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-sm leading-relaxed outline-none placeholder:text-neutral-400"
      />
    </div>
  )
}
