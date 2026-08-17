import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { getStudy, getStudyMembers } from '@/lib/studyApi'

/**
 * 현재 보고 있는 스터디. URL 의 slug 로 정해진다.
 * 전환기 상태로만 들고 있으면 링크 공유가 안 되므로 경로에 넣었다.
 */
export function useStudy() {
  const { studySlug = '' } = useParams()

  const { data: study, isPending } = useQuery({
    queryKey: ['study', studySlug],
    queryFn: () => getStudy(studySlug),
    enabled: !!studySlug,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['studyMembers', studySlug],
    queryFn: () => getStudyMembers(studySlug),
    enabled: !!study,
  })

  return { study: study ?? null, members, isPending, studySlug }
}
