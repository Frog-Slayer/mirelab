import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  changeAccessRequestStatus,
  getAccessRequests,
  getMembers,
  getStudies,
  replaceUserStudies,
} from '@/lib/adminApi'
import {
  AccessRequestStatus,
  Role,
  type AccessRequest,
  type AccessRequestStatus as Status,
  type AdminUser,
  type Study,
} from '@/types'
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
  const { data: studies = [] } = useQuery({ queryKey: ['adminStudies'], queryFn: getStudies })
  const visibleMembers = members.filter((member) => member.role !== Role.ADMIN)

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['accessRequests'] })
    void qc.invalidateQueries({ queryKey: ['adminMembers'] })
  }

  const changeStatus = useMutation({
    mutationFn: (input: { requestId: string; status: Status }) =>
      changeAccessRequestStatus(input.requestId, input.status),
    onSuccess: refresh,
  })
  const changeStudies = useMutation({
    mutationFn: (input: { userId: string; studyIds: string[] }) =>
      replaceUserStudies(input.userId, input.studyIds),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['adminMembers'] })
      void qc.invalidateQueries({ queryKey: ['myStudies'] })
      void qc.invalidateQueries({ queryKey: ['studyMembers'] })
    },
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
        <p className="mt-1 text-sm text-neutral-500">
          각 멤버가 참여할 스터디를 선택합니다. 한 명이 여러 스터디에 참여할 수 있습니다.
        </p>
        <ul className="mt-4 divide-y divide-neutral-100 border-y border-neutral-100">
          {visibleMembers.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              studies={studies}
              busy={changeStudies.isPending}
              onChange={(studyIds) => changeStudies.mutate({ userId: member.id, studyIds })}
            />
          ))}
        </ul>
        {changeStudies.isError && (
          <p className="mt-3 text-sm text-rose-700">
            스터디 배정을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.
          </p>
        )}
      </section>
    </div>
  )
}

function MemberRow({
  member,
  studies,
  busy,
  onChange,
}: {
  member: AdminUser
  studies: Study[]
  busy: boolean
  onChange: (studyIds: string[]) => void
}) {
  const currentStudyIds = member.studyIds ?? []
  const toggleStudy = (studyId: string, checked: boolean) => {
    const next = checked
      ? [...new Set([...currentStudyIds, studyId])]
      : currentStudyIds.filter((id) => id !== studyId)
    onChange(next)
  }

  return (
    <li className="flex flex-col gap-3 py-3 text-sm sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className={`size-2 flex-none rounded-full ${member.color}`} aria-hidden />
        <span className="text-neutral-800">{member.name}</span>
        <span className="truncate text-neutral-400">
          {/* 이메일이 없으면 로그인 계정이 안 붙은 데모 데이터 주인이다 */}
          {member.email ?? '로그인 계정 없음'}
        </span>
        {member.role === 'ADMIN' && <span className="text-xs text-neutral-500">관리자</span>}
      </div>

      <div className="flex flex-wrap gap-2 sm:justify-end">
        {studies.map((study) => (
          <label
            key={study.id}
            className="flex cursor-pointer items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-600"
          >
            <input
              type="checkbox"
              checked={currentStudyIds.includes(study.id)}
              disabled={busy}
              onChange={(event) => toggleStudy(study.id, event.target.checked)}
            />
            {study.name}
          </label>
        ))}
        {studies.length === 0 && <span className="text-xs text-neutral-400">등록된 스터디 없음</span>}
      </div>
    </li>
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
