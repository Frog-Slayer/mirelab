import { Navigate, useSearchParams } from 'react-router'
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
  if (status === 'authenticated') return <Navigate to="/" replace />

  const notice = NOTICES[params.get('status') ?? params.get('error') ?? '']

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">mirelab</h1>
        <p className="mt-2 text-sm text-neutral-500">스터디 기록을 함께 쌓는 곳</p>

        {notice && (
          <p
            className={`mt-6 rounded-md px-3 py-2.5 text-sm ${
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
          className="mt-8 w-full cursor-pointer rounded-md border border-neutral-200 py-2.5 text-sm font-medium hover:bg-neutral-50"
        >
          구글로 계속하기
        </button>

        <p className="mt-4 text-xs text-neutral-400">
          처음 로그인하면 가입 신청이 접수되고, 관리자 승인 후에 들어올 수 있습니다.
        </p>
      </div>
    </div>
  )
}
