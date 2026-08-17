import { useQuery } from '@tanstack/react-query'
import MonthCalendar from '@/components/MonthCalendar'
import { useStudy } from '@/hooks/useStudy'
import { getSchedule } from '@/lib/scheduleApi'

export default function SchedulePage() {
  const { study } = useStudy()

  const { data: items = [] } = useQuery({
    queryKey: ['schedule', study?.slug],
    queryFn: () => getSchedule(study!.slug),
    enabled: !!study,
  })

  if (!study) return null

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">일정</h1>
        <p className="text-sm text-neutral-500">날짜가 잡힌 회차만 달력에 올라옵니다.</p>
      </div>

      <MonthCalendar items={items} slug={study.slug} />
    </div>
  )
}
