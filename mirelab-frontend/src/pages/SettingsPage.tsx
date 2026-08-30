import { useRef, useState, type FormEvent } from 'react'
import Avatar from '@/components/Avatar'
import { useCurrentUser } from '@/hooks/currentUser'
import { apiErrorMessage } from '@/lib/api'
import { toAvatarBlob } from '@/lib/image'
import { removeMyPicture, updateMyName, uploadMyPicture } from '@/lib/userApi'
import type { User } from '@/types'

export default function SettingsPage() {
  const { user, applyUser } = useCurrentUser()

  // RequireAuth 를 통과해야 여기 오지만, 첫 렌더에서 잠깐 null 일 수 있다
  if (!user) return null

  return <SettingsForm user={user} applyUser={applyUser} />
}

function SettingsForm({ user, applyUser }: { user: User; applyUser: (user: User) => void }) {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">설정</h1>

      <PictureSection user={user} applyUser={applyUser} />
      <NameSection user={user} applyUser={applyUser} />
    </div>
  )
}

function PictureSection({ user, applyUser }: { user: User; applyUser: (user: User) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async (task: () => Promise<User>, fallbackMessage: string) => {
    setBusy(true)
    setError('')
    try {
      applyUser(await task())
    } catch (err) {
      setError(apiErrorMessage(err, fallbackMessage))
    } finally {
      setBusy(false)
    }
  }

  const pick = async (file: File | undefined) => {
    if (!file || busy) return

    // 버튼은 업로드를 시작하기 전, 파일을 받아든 순간 잠근다 — 디코딩·리사이즈에도 시간이
    // 걸려서 그 사이 한 번 더 고를 수 있고, 그러면 업로드 두 개가 겹쳐 나간다. 진 쪽이 올린
    // 파일은 DB 가 가리키지 않는 채로 볼륨에 영영 남는다.
    setBusy(true)
    setError('')

    let image: Blob
    try {
      image = await toAvatarBlob(file)
    } catch {
      setError('이미지 파일을 골라 주세요.')
      setBusy(false)
      return
    }

    try {
      applyUser(await uploadMyPicture(image))
    } catch (err) {
      setError(apiErrorMessage(err, '사진을 올리지 못했습니다. 잠시 뒤 다시 시도해 주세요.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-8 border-t border-neutral-100 pt-8">
      <h2 className="text-sm font-medium text-neutral-900">프로필 사진</h2>

      <div className="mt-4 flex items-center gap-5">
        <Avatar user={user} size="lg" />

        <div className="flex flex-col items-start gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              // 같은 파일을 다시 골라도 change 가 뜨게 비워둔다(업로드 실패 후 재시도)
              event.target.value = ''
              void pick(file)
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer rounded-md border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? '올리는 중…' : '사진 바꾸기'}
          </button>

          {user.pictureUrl && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(removeMyPicture, '사진을 지우지 못했습니다. 잠시 뒤 다시 시도해 주세요.')
              }
              className="cursor-pointer text-sm text-neutral-500 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              사진 지우기
            </button>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-neutral-500">
        가운데를 정사각형으로 잘라 올립니다. PNG·JPEG·WebP.
      </p>
      {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
    </section>
  )
}

function NameSection({ user, applyUser }: { user: User; applyUser: (user: User) => void }) {
  const [name, setName] = useState(user.name)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const changed = name.trim() !== user.name && name.trim() !== ''

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!changed || saving) return

    setSaving(true)
    setError('')
    setSaved(false)
    try {
      applyUser(await updateMyName(name.trim()))
      setSaved(true)
    } catch (err) {
      setError(apiErrorMessage(err, '이름을 바꾸지 못했습니다. 잠시 뒤 다시 시도해 주세요.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 border-t border-neutral-100 pt-8">
      <h2 className="text-sm font-medium text-neutral-900">이름</h2>

      <div className="mt-4 flex gap-2">
        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            setSaved(false)
          }}
          maxLength={40}
          aria-label="이름"
          className="app-input w-full"
        />
        <button
          type="submit"
          disabled={!changed || saving}
          className="shrink-0 cursor-pointer rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
      {saved && <p className="mt-2 text-sm text-emerald-700">이름을 바꿨습니다.</p>}
    </form>
  )
}
