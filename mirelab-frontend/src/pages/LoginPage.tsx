import { Link, Navigate, useSearchParams } from 'react-router'
import { useCurrentUser } from '@/hooks/currentUser'
import { startGoogleLogin } from '@/lib/authApi'

/**
 * 서버가 리다이렉트로 붙여주는 상태값. 등록 안 된 계정은 거부가 아니라 가입 신청이 되고,
 * admin 이 승인한 뒤에 다시 로그인하면 들어온다.
 */
const NOTICES: Record<string, { tone: 'info' | 'error'; text: string }> = {
  pending: {
    tone: 'info',
    text: '가입 신청이 접수됐습니다. 관리자가 승인하면 다시 로그인해 주세요.',
  },
  rejected: {
    tone: 'error',
    text: '가입 신청이 거절된 계정입니다. 관리자에게 문의해 주세요.',
  },
  no_email: {
    tone: 'error',
    text: '구글 계정에서 이메일을 받아오지 못했습니다. 이메일 제공에 동의한 뒤 다시 시도해 주세요.',
  },
  oauth_failed: {
    tone: 'error',
    text: '구글 로그인에 실패했습니다. 잠시 뒤 다시 시도해 주세요.',
  },
  session_expired: {
    tone: 'info',
    text: '로그인이 만료됐습니다. 다시 로그인해 주세요.',
  },
}

export default function LoginPage() {
  const [params] = useSearchParams()
  const { status } = useCurrentUser()

  // 이미 로그인된 상태로 /login 에 오면(뒤로가기 등) 홈으로 되돌린다
  if (status === 'authenticated') return <Navigate to="/app" replace />

  const notice = NOTICES[params.get('status') ?? params.get('error') ?? '']

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-16">
      <div className="app-card w-full max-w-md p-8 sm:p-10">
        <Link to="/" className="font-serif text-3xl font-semibold tracking-[-0.045em]">
          mirelab<span className="text-[#39725f]">.</span>
        </Link>
        <p className="mt-2 text-sm text-neutral-500">스터디 기록을 함께 쌓는 곳</p>

        {notice && (
          <p
            className={`mt-7 rounded-xl px-4 py-3 text-sm ${
              notice.tone === 'error'
                ? 'bg-rose-50 text-rose-800'
                : 'bg-neutral-100 text-neutral-700'
            }`}
          >
            {notice.text}
          </p>
        )}

        <button
          type="button"
          onClick={startGoogleLogin}
          className="app-button app-button-secondary mt-8 w-full"
        >
          <GoogleLogo />
          구글로 계속하기
        </button>

        <p className="mt-4 text-xs text-neutral-500">
          처음 로그인하면 가입 신청이 접수되고, 관리자 승인 후에 들어올 수 있습니다.
        </p>
      </div>
    </div>
  )
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px] flex-none" aria-hidden>
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.55h3.24c1.9-1.75 2.98-4.33 2.98-7.42Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.63-2.35l-3.24-2.55c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.93A6.03 6.03 0 0 1 6.07 12c0-.67.12-1.32.32-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.55l3.35-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.94c1.47 0 2.79.5 3.82 1.5l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
      />
    </svg>
  )
}
