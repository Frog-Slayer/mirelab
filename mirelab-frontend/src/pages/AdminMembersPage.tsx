import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  changeAccessRequestStatus,
  getAccessRequests,
  getMembers,
} from '@/lib/adminApi'
import { AccessRequestStatus, type AccessRequest, type AccessRequestStatus as Status } from '@/types'
import { ApiError } from '@/lib/api'

/**
 * 고를 수 있는 색은 이 넷뿐이다 — CollaborativeBody 의 COLOR_HEX 가 매핑하는 값들이라
 * 여기서 다른 tailwind 클래스를 넣으면 Yjs 커서가 회색으로 떨어진다.
 */
export default function AdminMembersPage() {
  const qc = useQueryClient()

  const { data: requests = [] } = useQuery({
    queryKey: ['accessRequests'],
    queryFn: getAccessRequests,
  })
  const { data: members = [] } = useQuery({ queryKey: ['adminMembers'], queryFn: getMembers })

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['accessRequests'] })
    void qc.invalidateQueries({ queryKey: ['adminMembers'] })
  }

  const changeStatus = useMutation({
    mutationFn: (input: { requestId: string; status: Status }) =>
      changeAccessRequestStatus(input.requestId, input.status),
    onSuccess: refresh,
  })

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="text-lg font-semibold tracking-[-0.02em]">가입 상태</h1>
        <p className="mt-1 text-sm text-neutral-500">
          정보 입력 대기로 바꾸면 신청자가 다음 로그인에서 이름과 색을 직접 정합니다.
        </p>

        {requests.length === 0 ? (
          <p className="mt-6 text-sm text-neutral-400">가입 신청 이력이 없습니다.</p>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {requests.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                hasUser={members.some((member) => member.email === request.email)}
                busy={changeStatus.isPending}
                onChange={(status) => {
                  changeStatus.reset()
                  changeStatus.mutate({
                    requestId: request.id,
                    status,
                  })
                }}
              />
            ))}
          </ul>
        )}

        {changeStatus.isError && (
          <p className="mt-3 text-sm text-rose-700">
            {statusChangeError(changeStatus.error)}
          </p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-[-0.02em]">현재 가입된 멤버</h2>
        <ul className="mt-4 divide-y divide-neutral-100 border-y border-neutral-100">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className={`size-2 rounded-full ${member.color}`} aria-hidden />
              <span className="text-neutral-800">{member.name}</span>
              <span className="text-neutral-400">
                {/* 이메일이 없으면 로그인 계정이 안 붙은 데모 데이터 주인이다 */}
                {member.email ?? '로그인 계정 없음'}
              </span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                가입 완료
              </span>
              {member.role === 'ADMIN' && (
                <span className="ml-auto text-xs text-neutral-500">관리자</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function RequestRow({
  request,
  hasUser,
  busy,
  onChange,
}: {
  request: AccessRequest
  hasUser: boolean
  busy: boolean
  onChange: (status: Status) => void
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-md border border-neutral-200 p-3">
      <div className="min-w-40 flex-1">
        <p className="text-sm text-neutral-800">{request.googleName}</p>
        <p className="text-xs text-neutral-500">{request.email}</p>
      </div>

      <select
        value={request.status}
        disabled={busy}
        onChange={(event) => onChange(event.target.value as Status)}
        aria-label={`${request.email} 가입 상태`}
        className="cursor-pointer rounded-sm border border-neutral-200 px-2 py-1.5 text-sm disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400"
      >
        <option value={AccessRequestStatus.PENDING}>승인 대기</option>
        <option value={AccessRequestStatus.PROFILE_REQUIRED}>정보 입력 대기</option>
        <option value={AccessRequestStatus.APPROVED} disabled={!hasUser}>
          가입 완료
        </option>
        <option value={AccessRequestStatus.REJECTED}>거절</option>
      </select>
    </li>
  )
}

function statusChangeError(error: Error): string {
  if (error instanceof ApiError && error.body && typeof error.body === 'object') {
    const message = Reflect.get(error.body, 'message')
    if (typeof message === 'string' && message) return message
  }
  return '상태를 변경하지 못했습니다. 잠시 뒤 다시 시도해 주세요.'
}
