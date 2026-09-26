import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet, useLocation, useOutletContext, useParams } from 'react-router'
import { useCurrentUser } from '@/hooks/currentUser'
import type { RecordDrawerContext } from '@/hooks/useRecordDrawer'
import { isRestoredNavigation } from '@/lib/lastPageStore'
import { getMyStudies } from '@/lib/studyApi'

/** URL의 스터디에 속한 사용자만 하위 화면을 마운트한다. 실제 보안 경계는 백엔드가 담당한다. */
export default function RequireStudyMember() {
  const { studySlug = '' } = useParams()
  const { user } = useCurrentUser()
  const recordDrawer = useOutletContext<RecordDrawerContext>()
  const { state } = useLocation()
  const { data: studies = [], isPending } = useQuery({
    queryKey: ['myStudies', user?.id],
    queryFn: getMyStudies,
    enabled: !!user,
  })

  if (isPending) {
    return <p className="py-10 text-center text-sm text-neutral-500">스터디 권한을 확인하는 중…</p>
  }
  if (!studies.some((study) => study.slug === studySlug)) {
    // 로그인하며 마지막 자리로 끌려왔는데 그새 빠져나온 스터디였던 경우([lastPageStore])
    if (isRestoredNavigation(state)) return <Navigate to="/app" replace />

    return (
      <div className="py-16 text-center">
        <h1 className="text-lg font-semibold">참여 중인 스터디가 아닙니다</h1>
        <p className="mt-2 text-sm text-neutral-500">관리자에게 스터디 배정을 요청해 주세요.</p>
      </div>
    )
  }

  return <Outlet context={recordDrawer} />
}

export function StudyHomeRedirect() {
  const { user, isAdmin } = useCurrentUser()
  const { data: studies = [], isPending } = useQuery({
    queryKey: ['myStudies', user?.id],
    queryFn: getMyStudies,
    enabled: !!user,
  })

  if (isPending) return null
  if (studies[0]) return <Navigate to={`/${studies[0].slug}`} replace />
  if (isAdmin) return <Navigate to="/admin/members" replace />

  return (
    <div className="py-16 text-center">
      <h1 className="text-lg font-semibold">배정된 스터디가 없습니다</h1>
      <p className="mt-2 text-sm text-neutral-500">관리자에게 스터디 배정을 요청해 주세요.</p>
    </div>
  )
}
