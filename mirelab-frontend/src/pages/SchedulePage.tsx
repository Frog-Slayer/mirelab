import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import MonthCalendar from '@/components/MonthCalendar'
import { useCurrentUser } from '@/hooks/currentUser'
import { useStudy } from '@/hooks/useStudy'
import { addEvent, decidePoll, getPolls, getSchedule, vote, type PollDetail } from '@/mocks/api'
import { formatDday, formatMeetAt } from '@/lib/format'
import { Availability } from '@/types'

const marks: Array<{ key: Availability; label: string; cls: string }> = [
  { key: Availability.YES, label: '○', cls: 'text-emerald-700 border-emerald-600 bg-emerald-50' },
  { key: Availability.MAYBE, label: '△', cls: 'text-amber-700 border-amber-500 bg-amber-50' },
  { key: Availability.NO, label: '✕', cls: 'text-neutral-500 border-neutral-400 bg-neutral-100' },
]

export default function SchedulePage() {
  const { user } = useCurrentUser()
  const { study, members } = useStudy()
  const qc = useQueryClient()

  const { data: items = [] } = useQuery({
    queryKey: ['schedule', study?.id],
    queryFn: () => getSchedule(study!.id),
    enabled: !!study,
  })
  const { data: polls = [] } = useQuery({
    queryKey: ['polls', study?.id],
    queryFn: () => getPolls(study!.id),
    enabled: !!study,
  })

  const refresh = () => qc.invalidateQueries()
  const castVote = useMutation({ mutationFn: vote, onSuccess: refresh })
  const decide = useMutation({
    mutationFn: ({ pollId, index }: { pollId: string; index: number | null }) =>
      decidePoll(pollId, index),
    onSuccess: refresh,
  })
  const createEvent = useMutation({ mutationFn: addEvent, onSuccess: refresh })

  if (!study || !user) return null

  const now = new Date().toISOString().slice(0, 16)
  const upcoming = items.filter((i) => i.at >= now)
  const past = items.filter((i) => i.at < now).reverse()

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">일정</h1>
        <p className="text-sm text-neutral-500">
          날짜가 잡힌 회차만 달력에 올라옵니다. 아직 미정이면 아래에서 후보를 놓고 조율하세요.
        </p>
      </div>

      <MonthCalendar items={items} slug={study.slug} />

      {/* 날짜 조율 */}
      {polls.map((detail) => (
        <Poll
          key={detail.poll.id}
          detail={detail}
          memberCount={members.length}
          myId={user.id}
          onVote={(optionIndex, mark) =>
            castVote.mutate({ pollId: detail.poll.id, userId: user.id, optionIndex, mark })
          }
          onDecide={(index) => decide.mutate({ pollId: detail.poll.id, index })}
        />
      ))}

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[11px] tracking-[0.13em] text-neutral-400 uppercase">
          다가오는 일정
        </h2>
        {upcoming.length === 0 && (
          <p className="text-sm text-neutral-400">예정된 일정이 없습니다.</p>
        )}
        <ul className="flex flex-col">
          {upcoming.map((item, i) => (
            <li
              key={i}
              className="flex flex-wrap items-center gap-3 border-b border-neutral-100 py-3"
            >
              <span className="w-32 font-mono text-xs text-neutral-500">
                {formatMeetAt(item.at)}
              </span>
              {item.sessionId ? (
                <Link
                  to={`/${study.slug}/w/${item.sessionId}`}
                  className="text-sm font-medium hover:underline"
                >
                  {item.title}
                </Link>
              ) : (
                <span className="text-sm font-medium">{item.title}</span>
              )}
              {item.note && <span className="text-xs text-neutral-500">{item.note}</span>}
              <span className="ml-auto rounded-full border border-neutral-200 px-2 py-0.5 font-mono text-[11px] text-neutral-500">
                {formatDday(item.at)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <AddEventForm onSubmit={(input) => createEvent.mutate({ ...input, studyId: study.id })} />

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[11px] tracking-[0.13em] text-neutral-400 uppercase">
          지난 일정
        </h2>
        <ul className="flex flex-col">
          {past.map((item, i) => (
            <li
              key={i}
              className="flex items-center gap-3 border-b border-neutral-100 py-2 text-neutral-500"
            >
              <span className="w-32 font-mono text-xs">{formatMeetAt(item.at)}</span>
              <span className="text-sm">{item.title}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Poll({
  detail,
  memberCount,
  myId,
  onVote,
  onDecide,
}: {
  detail: PollDetail
  memberCount: number
  myId: string
  onVote: (optionIndex: number, mark: Availability) => void
  onDecide: (index: number | null) => void
}) {
  const { poll, votes, tally } = detail
  const mine = votes.find((v) => v.userId === myId)
  const best = tally.reduce((bi, t, i) => (t.yes > tally[bi].yes ? i : bi), 0)
  const decided = poll.decided !== null

  return (
    <section
      className={`flex flex-col gap-4 rounded-sm border p-4 ${
        decided ? 'border-neutral-200' : 'border-emerald-600 bg-emerald-50/30'
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[10px] tracking-[0.1em] text-neutral-400 uppercase">
          날짜 조율
        </span>
        <span className="text-sm font-medium">{poll.question}</span>
        {decided ? (
          <span className="rounded-full border border-neutral-300 px-2 py-0.5 font-mono text-[11px] text-neutral-500">
            확정됨 · {formatMeetAt(poll.options[poll.decided!])}
          </span>
        ) : (
          <span className="rounded-full border border-emerald-600 bg-emerald-50 px-2 py-0.5 font-mono text-[11px] text-emerald-700">
            조율 중 · {votes.length}/{memberCount}명 응답
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {poll.options.map((opt, i) => {
          const t = tally[i]
          const isDecided = poll.decided === i
          return (
            <div
              key={i}
              className={`flex flex-wrap items-center gap-3 rounded-sm border px-3 py-2 ${
                isDecided
                  ? 'border-emerald-600 bg-emerald-50'
                  : !decided && i === best && t.yes > 0
                    ? 'border-neutral-400'
                    : 'border-neutral-200'
              }`}
            >
              <span className="w-32 font-mono text-xs">{formatMeetAt(opt)}</span>

              <div className="flex gap-1">
                {marks.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => onVote(i, m.key)}
                    className={`w-8 cursor-pointer rounded-xs border py-0.5 text-xs ${
                      mine?.marks[i] === m.key
                        ? m.cls
                        : 'border-neutral-200 text-neutral-300 hover:text-neutral-600'
                    }`}
                    aria-label={m.key}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <span className="font-mono text-xs text-neutral-500 tabular-nums">
                ○{t.yes} △{t.maybe} ✕{t.no}
              </span>

              {!decided && i === best && t.yes > 0 && (
                <span className="text-[11px] text-neutral-500">가장 많이 됨</span>
              )}

              <div className="ml-auto">
                {isDecided ? (
                  <button
                    type="button"
                    onClick={() => onDecide(null)}
                    className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-900"
                  >
                    다시 조율
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onDecide(i)}
                    className="cursor-pointer rounded-sm border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:border-neutral-500"
                  >
                    이걸로 확정
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-neutral-500">
        확정하면 해당 회차의 모임 시각도 같이 바뀝니다. 나중에 다시 열 수 있습니다.
      </p>
    </section>
  )
}

function AddEventForm({
  onSubmit,
}: {
  onSubmit: (input: { at: string; title: string; note?: string }) => void
}) {
  const [at, setAt] = useState('')
  const [title, setTitle] = useState('')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!at || !title.trim()) return
        onSubmit({ at, title: title.trim() })
        setAt('')
        setTitle('')
      }}
      className="flex flex-wrap items-center gap-2 rounded-sm border border-dashed border-neutral-300 p-4"
    >
      <span className="w-full font-mono text-[10px] tracking-[0.1em] text-neutral-400 uppercase">
        회차 아닌 일정 추가
      </span>
      <input
        type="datetime-local"
        value={at}
        onChange={(e) => setAt(e.target.value)}
        className="rounded-sm border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
      />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="휴회, 뒤풀이 등"
        className="min-w-40 flex-1 rounded-sm border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
      />
      <button
        type="submit"
        className="cursor-pointer rounded-sm border border-emerald-600 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-100"
      >
        추가
      </button>
    </form>
  )
}
