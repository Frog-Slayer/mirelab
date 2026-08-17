import { useEffect, useRef } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import type { PartialBlock } from '@blocknote/core'
import { BlockNoteView } from '@blocknote/shadcn'
import '@blocknote/shadcn/style.css'
import type { SlotValueData } from '@/types'

/**
 * 개인 칸(예: 내 요약)용 리치 텍스트 에디터. 협업이 아니라 나만 쓰는 칸이라
 * Yjs 없이 BlockNote만 로컬로 붙인다 — 블록 JSON을 그대로 칸 값에 담는다.
 */
export default function PersonalBlockNoteField({
  value,
  onSave,
}: {
  value?: SlotValueData
  onSave: (value: SlotValueData) => void
}) {
  // 예전 UI는 이 칸을 { text } 로 저장했다 — 그대로 두면 조용히 버려지고 빈 에디터로
  // 시작한 뒤 다음 편집 때 덮어써 사라지므로, 문단 하나짜리 블록으로 옮겨 담는다.
  const initialBlocks: PartialBlock[] | undefined =
    value && 'blocks' in value
      ? (value.blocks as PartialBlock[])
      : value && 'text' in value && value.text
        ? [{ type: 'paragraph', content: value.text }]
        : undefined

  const editor = useCreateBlockNote({
    initialContent: initialBlocks && initialBlocks.length > 0 ? initialBlocks : undefined,
  })

  const saveRef = useRef(onSave)
  saveRef.current = onSave

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const unsubscribe = editor.onChange(() => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        saveRef.current({ blocks: editor.document })
      }, 600)
    })
    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [editor])

  return <BlockNoteView editor={editor} />
}
