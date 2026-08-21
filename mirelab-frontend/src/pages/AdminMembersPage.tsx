import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveAccessRequest,
  getAccessRequests,
  getMembers,
  rejectAccessRequest,
} from '@/lib/adminApi'
import type { AccessRequest } from '@/types'

/**
 * 고를 수 있는 색은 이 넷뿐이다 — CollaborativeBody 의 COLOR_HEX 가 매핑하는 값들이라
 * 여기서 다른 tailwind 클래스를 넣으면 Yjs 커서가 회색으로 떨어진다.
 */
const COLORS = [
  { value: 'bg-emerald-500', label: '초록' },
  { value: 'bg-sky-500', label: '파랑' },
  { value: 'bg-amber-500', label: '노랑' },
  { value: 'bg-rose-500', label: '빨강' },
] as const

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

  const approve = useMutation({
    mutationFn: (input: { requestId: string; name: string; color: string }) =>
      approveAccessRequest(input.requestId, { name: input.name, color: input.color }),
    onSuccess: refresh,
  })
  const reject = useMutation({ mutationFn: rejectAccessRequest, onSuccess: refresh })

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="text-lg font-semibold tracking-[-0.02em]">가입 신청</h1>
        <p className="mt-1 text-sm text-neutral-500">
          승인하면 그 이메일로 멤버가 만들어집니다. 스터디에 넣는 건 아직 따로 해야 합니다.
        </p>

        {requests.length === 0 ? (
          <p className="mt-6 text-sm text-neutral-400">대기 중인 신청이 없습니다.</p>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {requests.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                busy={approve.isPending || reject.isPending}
                onApprove={(name, color) => approve.mutate({ requestId: request.id, name, color })}
                onReject={() => reject.mutate(request.id)}
              />
            ))}
          </ul>
        )}

        {approve.isError && (
          <p className="mt-3 text-sm text-rose-700">
            승인하지 못했습니다 — 이미 가입된 이메일일 수 있습니다.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-[-0.02em]">멤버</h2>
        <ul className="mt-4 divide-y divide-neutral-100 border-y border-neutral-100">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className={`size-2 rounded-full ${member.color}`} aria-hidden />
              <span className="text-neutral-800">{member.name}</span>
              <span className="text-neutral-400">
                {/* 이메일이 없으면 로그인 계정이 안 붙은 데모 데이터 주인이다 */}
                {member.email ?? '로그인 계정 없음'}
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
  busy,
  onApprove,
  onReject,
}: {
  request: AccessRequest
  busy: boolean
  onApprove: (name: string, color: string) => void
  onReject: () => void
}) {
  // 구글 이름을 기본값으로 채워두고 admin 이 짧은 호칭으로 고치게 한다
  const [name, setName] = useState(request.googleName)
  const [color, setColor] = useState<string>(COLORS[0].value)

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-md border border-neutral-200 p-3">
      <div className="min-w-40 flex-1">
        <p className="text-sm text-neutral-800">{request.googleName}</p>
        <p className="text-xs text-neutral-500">{request.email}</p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-neutral-500">이름</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-24 rounded-sm border border-neutral-200 px-2 py-1"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <span className={`size-2 rounded-full ${color}`} aria-hidden />
        <select
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="cursor-pointer rounded-sm border border-neutral-200 px-2 py-1"
          aria-label="색 고르기"
        >
          {COLORS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        disabled={busy || !name.trim()}
        onClick={() => onApprove(name.trim(), color)}
        className="cursor-pointer rounded-sm bg-emerald-700 px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        승인
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onReject}
        className="cursor-pointer rounded-sm px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
      >
        거부
      </button>
    </li>
  )
}
