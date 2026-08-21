import { Link } from 'react-router'
import { useCurrentUser } from '@/hooks/currentUser'

const FEATURES = [
  {
    number: '01',
    title: '함께 정한 주제',
    body: '책, 기사, 영상과 질문을 모아 우리 스터디만의 흐름을 만듭니다.',
  },
  {
    number: '02',
    title: '각자의 기록',
    body: '서로 다른 생각과 관점을 한곳에 쌓고, 함께 볼 때 더 깊게 연결합니다.',
  },
  {
    number: '03',
    title: '이어지는 모임',
    body: '다음 일정과 준비할 내용을 공유하고 지난 대화까지 자연스럽게 이어갑니다.',
  },
]

export default function LandingPage() {
  const { status } = useCurrentUser()
  const signedIn = status === 'authenticated'
  const destination = signedIn ? '/app' : '/login'

  return (
    <div className="min-h-full overflow-hidden bg-[#f4f1e9] text-[#18251d]">
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="mirelab 홈">
          <span className="grid size-8 place-items-center rounded-full bg-emerald-900 text-sm font-semibold text-white">
            m
          </span>
          <span className="text-lg font-semibold tracking-[-0.04em]">mirelab</span>
        </Link>

        <Link
          to={destination}
          className="rounded-full border border-emerald-950/15 bg-white/55 px-4 py-2 text-sm font-medium backdrop-blur transition-colors hover:bg-white"
        >
          {signedIn ? '스터디로 이동' : '로그인'}
        </Link>
      </header>

      <main>
        <section className="relative mx-auto grid min-h-[calc(100vh-80px)] max-w-6xl items-center gap-14 px-6 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div className="relative z-[1] max-w-2xl">
            <p className="mb-5 flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-emerald-800 uppercase">
              <span className="h-px w-9 bg-emerald-700" />
              Learn · Think · Share
            </p>
            <h1 className="max-w-3xl text-5xl leading-[1.04] font-semibold tracking-[-0.065em] text-balance sm:text-6xl lg:text-7xl">
              <span className="block">함께 보고,</span>
              <span className="block">생각하고,</span>
              <span className="block text-emerald-800">기록하는 곳.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-[#526057] sm:text-lg sm:leading-8">
              독서부터 경제까지. 흩어지기 쉬운 자료와 생각, 모임의 순간을 한곳에 모아두세요.
            </p>

            <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Link
                to={destination}
                className="inline-flex min-h-12 items-center gap-3 rounded-full bg-emerald-900 px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(6,78,59,0.2)] transition-transform hover:-translate-y-0.5"
              >
                {signedIn ? '내 스터디로 가기' : '구글로 시작하기'}
                <span aria-hidden>→</span>
              </Link>
              {!signedIn && (
                <p className="text-xs leading-5 text-[#778078]">
                  첫 로그인 후 가입 신청 · 관리자 승인으로 참여합니다
                </p>
              )}
            </div>
          </div>

          <StudyPreview />

          <div
            className="pointer-events-none absolute -top-48 right-[-20rem] size-[42rem] rounded-full bg-emerald-200/45 blur-3xl"
            aria-hidden
          />
        </section>

        <section className="border-t border-emerald-950/10 bg-white/45">
          <div className="mx-auto grid max-w-6xl gap-px px-6 py-16 md:grid-cols-3 lg:px-8">
            {FEATURES.map((feature) => (
              <article
                key={feature.number}
                className="border-b border-emerald-950/10 py-7 md:border-r md:border-b-0 md:px-8 md:first:pl-0 md:last:border-r-0 md:last:pr-0"
              >
                <span className="font-mono text-xs text-emerald-700">{feature.number}</span>
                <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em]">{feature.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[#69736c]">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-emerald-950/10 bg-white/45 px-6 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between text-xs text-[#7b837d]">
          <span>mirelab</span>
          <span>함께 배우고, 오래 남기기</span>
        </div>
      </footer>
    </div>
  )
}

function StudyPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:justify-self-end" aria-label="스터디 기록 미리보기">
      <div className="absolute -inset-5 rotate-3 rounded-[2.5rem] bg-emerald-900/10" aria-hidden />
      <div className="relative overflow-hidden rounded-[2rem] border border-emerald-950/10 bg-[#fffdf8] p-5 shadow-[0_30px_80px_rgba(34,58,43,0.16)] sm:p-7">
        <div className="flex items-center justify-between border-b border-emerald-950/10 pb-5">
          <div>
            <p className="text-xs text-[#7d857f]">나의 스터디</p>
            <div className="mt-2 flex gap-1.5">
              <span className="rounded-full bg-emerald-900 px-2.5 py-1 text-[10px] font-medium text-white">독서</span>
              <span className="rounded-full bg-[#ebe7dc] px-2.5 py-1 text-[10px] font-medium text-[#606a63]">경제</span>
            </div>
          </div>
          <div className="flex -space-x-2" aria-label="참여 멤버 3명">
            <span className="size-7 rounded-full border-2 border-[#fffdf8] bg-emerald-500" />
            <span className="size-7 rounded-full border-2 border-[#fffdf8] bg-sky-500" />
            <span className="size-7 rounded-full border-2 border-[#fffdf8] bg-amber-500" />
          </div>
        </div>

        <div className="grid grid-cols-[6.5rem_1fr] gap-5 py-6">
          <div className="relative aspect-[2/3] overflow-hidden rounded-sm bg-emerald-950 p-4 text-white shadow-lg">
            <div className="absolute inset-x-0 top-0 h-1 bg-amber-300" />
            <p className="text-[10px] tracking-[0.16em] text-emerald-200 uppercase">Study Note</p>
            <p className="mt-5 text-lg leading-tight font-semibold">생각을 넓히는 다음 주제</p>
            <span className="absolute right-4 bottom-4 text-xl text-amber-300">✦</span>
          </div>
          <div className="flex min-w-0 flex-col justify-between py-1">
            <div>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800">진행 중</span>
              <h2 className="mt-4 text-xl font-semibold tracking-[-0.035em]">한 가지 주제, 여러 시선</h2>
              <p className="mt-2 text-xs leading-5 text-[#7a827c]">서로 다른 생각이 모여 더 오래 남는 기록이 됩니다.</p>
            </div>
            <div className="mt-5">
              <div className="mb-2 flex justify-between text-[11px] text-[#7a827c]">
                <span>다음 모임까지</span>
                <span>6일</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-emerald-950/10">
                <div className="h-full w-2/3 rounded-full bg-emerald-700" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {[
            ['참여', '4'],
            ['의견', '8'],
            ['기록', '12'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-[#f1f3ed] px-3 py-3">
              <p className="text-[10px] text-[#7a827c]">{label}</p>
              <p className="mt-1 font-mono text-lg font-semibold text-emerald-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-emerald-950/10 px-4 py-3">
          <p className="text-[10px] text-[#7a827c]">최근 남긴 생각</p>
          <p className="mt-1.5 text-xs leading-5 text-[#465249]">“함께 보니 혼자서는 지나쳤던 질문이 보였다.”</p>
        </div>
      </div>
    </div>
  )
}
