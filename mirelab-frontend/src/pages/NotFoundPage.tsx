import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">404</h1>
      <p className="text-neutral-600">요청하신 페이지를 찾을 수 없습니다.</p>
      <Link to="/" className="text-sm underline underline-offset-4">
        홈으로 돌아가기
      </Link>
    </section>
  )
}
