import { useEffect, useRef } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import type { PartialBlock } from '@blocknote/core'
import { BlockNoteView } from '@blocknote/shadcn'
import '@blocknote/shadcn/style.css'
import type { BlockDocument } from '@/types'

/**
 * 혼자 쓰는 긴 글용 리치 텍스트 에디터(내 서재의 개인 노트, 블로그 글). 협업이 아니라
 * 나만 쓰는 자리라 Yjs 없이 BlockNote만 로컬로 붙인다 — 블록 JSON을 그대로 담는다.
 *
 * 서랍의 짧은 메모는 이걸 안 쓴다. 448px 안에서 슬래시 메뉴·드래그 핸들·서식 도구까지
 * 딸려 오는 건 과해서, 거기는 글 상자 하나다([NoteBody]).
 */
export default function PersonalBlockNoteField({
  value,
  onSave,
}: {
  value?: BlockDocument
  onSave: (value: BlockDocument) => void
}) {
  const initialBlocks = value?.blocks as PartialBlock[] | undefined

  const editor = useCreateBlockNote({
    initialContent: initialBlocks && initialBlocks.length > 0 ? initialBlocks : undefined,
  })

  const saveRef = useRef(onSave)
  saveRef.current = onSave

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = editor.onChange(() => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        timer = undefined
        saveRef.current({ blocks: editor.document })
      }, 600)
    })
    return () => {
      // 대기 중이던 저장이 있으면 취소만 하지 말고 그 자리에서 마저 반영한다 —
      // 안 그러면 마지막 입력 후 600ms 안에 다른 작품·사용자로 넘어갈 때 그 편집이 사라진다.
      if (timer !== undefined) {
        clearTimeout(timer)
        saveRef.current({ blocks: editor.document })
      }
      unsubscribe()
    }
  }, [editor])

  return <BlockNoteView editor={editor} theme="light" />
}
