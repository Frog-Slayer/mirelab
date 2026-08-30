import { useEffect, useState } from 'react'
import Stars from '@/components/Stars'

/**
 * 별점만 단독으로 두는 곳(내 서재)에서 쓴다 — 훑는 동안 매 순간을 저장하면
 * 요청이 쌓여 저장이 꼬이니, 로컬에서 다 매기고 저장을 눌러야 반영한다.
 */
export default function RatingControl({
  value,
  onSave,
}: {
  value: number
  onSave: (next: number) => void
}) {
  const [rating, setRating] = useState(value)

  // 다른 책으로 이동하는 등 바깥에서 값이 바뀐 경우
  useEffect(() => setRating(value), [value])

  const dirty = rating !== value

  return (
    <div className="flex items-center gap-3">
      <Stars value={rating} size="lg" onChange={setRating} />
      {dirty && (
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setRating(value)}
            className="app-button app-button-ghost"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onSave(rating)}
            className="app-button app-button-primary"
          >
            저장
          </button>
        </div>
      )}
    </div>
  )
}
