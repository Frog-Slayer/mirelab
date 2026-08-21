import { api } from '@/lib/api'
import type { AccessRequest, AccessRequestStatus, AdminUser } from '@/types'

/** 대기부터 가입 완료까지 전체 가입 신청 이력 */
export function getAccessRequests(): Promise<AccessRequest[]> {
  return api.get('/admin/access-requests')
}

export function getMembers(): Promise<AdminUser[]> {
  return api.get('/admin/users')
}

/** 승인 뒤 이름·색은 신청자가 다음 로그인에서 직접 정한다 */
export function approveAccessRequest(requestId: string): Promise<void> {
  return api.post(`/admin/access-requests/${requestId}/approve`)
}

export function rejectAccessRequest(requestId: string): Promise<void> {
  return api.post(`/admin/access-requests/${requestId}/reject`)
}

export function changeAccessRequestStatus(
  requestId: string,
  status: AccessRequestStatus,
): Promise<void> {
  return api.patch(`/admin/access-requests/${requestId}/status`, { status })
}
