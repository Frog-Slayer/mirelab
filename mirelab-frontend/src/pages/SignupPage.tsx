import { useEffect, useState, type FormEvent } from 'react'
import { completeSignup, getSignupProfile, startGoogleLogin } from '@/lib/authApi'
import { apiErrorMessage } from '@/lib/api'

const COLORS = [
  { value: 'bg-emerald-500', label: '초록' },
  { value: 'bg-sky-500', label: '파랑' },
  { value: 'bg-amber-500', label: '노랑' },
  { value: 'bg-rose-500', label: '빨강' },
] as const

export default function SignupPage() {
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [color, setColor] = useState<string>(COLORS[0].value)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getSignupProfile()
      .then((profile) => {
        setName(profile.googleName)
        setEmail(profile.email)
      })
      .catch(() => setError('가입 정보 입력 시간이 만료됐습니다. 구글 로그인을 다시 해 주세요.'))
      .finally(() => setLoading(false))
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!username.trim() || !name.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      await completeSignup({ username: username.trim(), name: name.trim(), color })
      window.location.replace('/auth/callback')
    } catch (err) {
      setError(apiErrorMessage(err, '가입을 완료하지 못했습니다. 잠시 뒤 다시 시도해 주세요.'))
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="px-6 py-16 text-center text-sm text-neutral-400">가입 정보를 불러오는 중…</p>
  }

  if (!email) {
    return (
      <div className="flex min-h-full items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold">가입 정보를 불러올 수 없습니다</h1>
          <p className="mt-3 text-sm text-neutral-500">{error}</p>
          <button
            type="button"
            onClick={startGoogleLogin}
            className="mt-6 w-full cursor-pointer rounded-md border border-neutral-200 py-2.5 text-sm font-medium hover:bg-neutral-50"
          >
            구글로 다시 로그인
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-16">
      <form onSubmit={submit} className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">가입 정보 입력</h1>
        <p className="mt-2 text-sm text-neutral-500">관리자 승인이 완료됐습니다.</p>

        <label className="mt-8 block text-sm">
          <span className="text-neutral-600">사용자 이름</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
            minLength={3}
            maxLength={30}
            pattern="[a-z0-9][a-z0-9_-]{2,29}"
            autoCapitalize="none"
            autoComplete="username"
            spellCheck={false}
            autoFocus
            placeholder="yeongseo"
            className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2.5 outline-none focus:border-neutral-400"
          />
          <span className="mt-1.5 block text-xs text-neutral-400">
            블로그 주소에 사용하며 가입 후에는 바꿀 수 없습니다.
          </span>
        </label>

        <label className="mt-6 block text-sm">
          <span className="text-neutral-600">이름</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={40}
            className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2.5 outline-none focus:border-neutral-400"
          />
        </label>

        <div className="mt-6">
          <p className="text-sm text-neutral-600">내 색</p>
          <div className="mt-2 flex gap-3">
            {COLORS.map((candidate) => (
              <label key={candidate.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="color"
                  value={candidate.value}
                  checked={color === candidate.value}
                  onChange={() => setColor(candidate.value)}
                  className="sr-only"
                />
                <span
                  className={`block size-8 rounded-full ${candidate.value} ${
                    color === candidate.value ? 'ring-2 ring-neutral-700 ring-offset-2' : ''
                  }`}
                  title={candidate.label}
                />
              </label>
            ))}
          </div>
        </div>

        <p className="mt-6 text-xs text-neutral-400">로그인 계정: {email}</p>
        {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}

        <button
          type="submit"
          disabled={!username.trim() || !name.trim() || saving}
          className="mt-6 w-full cursor-pointer rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? '가입하는 중…' : '가입하고 시작하기'}
        </button>
      </form>
    </div>
  )
}
