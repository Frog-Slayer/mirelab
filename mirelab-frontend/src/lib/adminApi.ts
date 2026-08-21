import { api } from '@/lib/api'
import type { AccessRequest, AdminUser } from '@/types'

/** 대기 중인 가입 신청만 온다 */
export function getAccessRequests(): Promise<AccessRequest[]> {
  return api.get('/admin/access-requests')
}

export function getMembers(): Promise<AdminUser[]> {
  return api.get('/admin/users')
}

/** 이름·색은 admin 이 정한다 — 구글 이름을 그대로 쓰면 화면의 짧은 호칭과 안 맞는다 */
export function approveAccessRequest(
  requestId: string,
  input: { name: string; color: string },
): Promise<AdminUser> {
  return api.post(`/admin/access-requests/${requestId}/approve`, input)
}

export function rejectAccessRequest(requestId: string): Promise<void> {
  return api.post(`/admin/access-requests/${requestId}/reject`)
}
