import { useCurrentUser } from '@/hooks/currentUser'

// 로그인 전까지 쓰는 개발용 전환기. 계정을 여러 개 만들지 않고도
// 제출 현황이나 마감 전 가리기 동작을 시점 바꿔가며 확인할 수 있다.
export default function UserSwitcher() {
  const { users, user, setUserId } = useCurrentUser()
  if (!user) return null

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className={`size-2 rounded-full ${user.color}`} aria-hidden />
      <select
        value={user.id}
        onChange={(e) => setUserId(e.target.value)}
        className="cursor-pointer rounded-sm border border-neutral-200 bg-white py-1 pr-1 pl-2 text-sm text-neutral-700"
        title="로그인 붙기 전까지 쓰는 임시 전환기"
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </label>
  )
}
