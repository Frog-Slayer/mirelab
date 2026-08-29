import { useLayoutEffect, useRef, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { useDebouncedSave } from '@/hooks/useDebouncedSave'
import { clearDraft, readDraft, writeDraft } from '@/lib/draftStore'
import type { SlotValueData } from '@/types'

/**
 * 개인 칸용 글 상자. 예전에는 여기도 BlockNote 였는데, 448px 짜리 서랍 안에서 슬래시
 * 메뉴·드래그 핸들·서식 도구까지 딸려 오는 건 과했다. 남기는 게 몇 줄짜리 메모라면 글
 * 상자 하나면 된다 — 진짜 문서를 쓰는 자리(내 서재의 개인 노트, 블로그 글)는 그대로 둔다.
 *
 * 예전에 BlockNote 로 저장해 둔 값({ blocks })도 읽어서 보여준다. 다만 굵기·목록 같은
 * 서식은 글 상자가 담을 수 없어 글자만 남는다 — 그 손실은 실제로 고쳐 저장할 때 일어나고,
 * 열어만 보고 나가면 서버의 값은 그대로다.
 *
 * `draftKey` 를 주면 치는 대로 브라우저에도 사본을 남긴다([draftStore]). 서버에 들어간 게
 * 확인되면 지우고, 못 들어간 채로 탭이 닫혔으면 다음에 열 때 되살릴지 묻는다.
 */
export default function PersonalNoteField({
  value,
  placeholder = '읽으면서 남기고 싶은 것을 자유롭게 적어두세요',
  draftKey,
  onSave,
}: {
  value?: SlotValueData
  placeholder?: string
  /** 이 칸을 가리키는 이름(작품·사람·칸). 안 주면 사본을 남기지 않는다 */
  draftKey?: string
  onSave: (value: SlotValueData) => void | Promise<unknown>
}) {
  const initial = value && 'text' in value ? value.text : flatten(value)

  /**
   * 화면에 지금 있는 글. 저장이 끝났을 때 "그새 더 쳤는지" 를 가리는 데 쓴다 —
   * 방금 보낸 것보다 새 글자가 있으면 사본을 지우면 안 된다.
   */
  const latest = useRef(initial)

  const [text, setText] = useDebouncedSave(initial, (next) => {
    const result = onSave({ text: next })
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
    return saved !== null && saved !== initial ? saved : null
  })

  const change = (next: string) => {
    setText(next)
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
        // 손잡이로 끄는 크기 조절은 끈다 — 높이는 글이 정한다. 비어 있어도 쓸 자리로 보이게 바닥은 깔아둔다
        className="app-input min-h-36 w-full resize-none overflow-hidden text-sm leading-relaxed"
      />
    </div>
  )
}

/**
 * BlockNote 블록 JSON 에서 글자만 훑어 낸다. 블록 하나가 한 줄이 되고, 안에 든 블록
 * (목록 안의 목록 등)도 제 줄을 갖는다.
 *
 * 타입을 any 로 받지 않으려고 좁혀 가며 읽는다 — 저장된 JSON 은 우리가 만든 모양이 아니라
 * BlockNote 의 것이고, 판(version)이 바뀌면 모양도 바뀔 수 있어서 없는 필드를 만나도
 * 터지지 않아야 한다.
 */
function flatten(value?: SlotValueData): string {
  if (!value || !('blocks' in value) || !Array.isArray(value.blocks)) return ''

  const lines: string[] = []

  const walk = (nodes: unknown[]) => {
    for (const node of nodes) {
      if (typeof node !== 'object' || node === null) continue
      const block = node as { content?: unknown; children?: unknown }

      if (typeof block.content === 'string') lines.push(block.content)
      else if (Array.isArray(block.content)) {
        const line = block.content
          .map((inline) =>
            typeof inline === 'object' && inline !== null && 'text' in inline
              ? String((inline as { text: unknown }).text)
              : '',
          )
          .join('')
        lines.push(line)
      }

      if (Array.isArray(block.children)) walk(block.children)
    }
  }
  walk(value.blocks)

  // 끝에 붙은 빈 문단들은 버린다 — BlockNote 는 늘 빈 문단 하나로 끝난다
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()
  return lines.join('\n')
}
