import { useEffect, useRef, useState } from 'react'

/**
 * 입력값을 로컬에서 즉시 반영하고, 잠시 뒤 저장한다.
 * 제출 버튼을 기다리게 하면 개인 정리를 여기서 안 하게 된다.
 */
export function useDebouncedSave<T>(initial: T, save: (value: T) => void, ms = 600) {
  const [value, setValue] = useState(initial)
  const saveRef = useRef(save)
  saveRef.current = save

  // 다른 회차로 이동하는 등 바깥에서 값이 바뀐 경우
  const initialRef = useRef(initial)
  useEffect(() => {
    if (JSON.stringify(initialRef.current) !== JSON.stringify(initial)) {
      initialRef.current = initial
      setValue(initial)
    }
  }, [initial])

  const dirty = useRef(false)

  useEffect(() => {
    if (!dirty.current) return
    const timer = setTimeout(() => saveRef.current(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])

  const update = (next: T) => {
    dirty.current = true
    setValue(next)
  }

  return [value, update] as const
}
