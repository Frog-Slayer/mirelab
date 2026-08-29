import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import ThisSessionBanner from '@/components/ThisSessionBanner'
import { FloatingStack } from '@/components/layout/FloatingStack'
import NotificationsMenu from '@/components/layout/NotificationsMenu'
import UserMenu from '@/components/layout/UserMenu'
import { useCurrentUser } from '@/hooks/currentUser'
import type { RecordDrawerContext } from '@/hooks/useRecordDrawer'
import { getMyStudies } from '@/lib/studyApi'
import type { Study } from '@/types'

/**
 * 헤더·본문·푸터가 같은 기둥 위에 서도록 폭 상한과 좌우 여백을 한 줄로 묶어둔다.
 * 세 군데(헤더 막대·탭 줄·푸터)에 흩어 놓으면 하나만 고쳐졌을 때 로고와 본문,
 * 푸터 글자의 왼쪽 끝이 조용히 어긋난다.
 *
 * max-width 와 padding 은 반드시 같은 요소에 함께 걸어야 한다 — box-sizing 이
 * border-box 라 상한값이 padding 을 포함하기 때문에, 바깥에 padding 을 주고 안쪽에
 * max-width 를 주면 그 padding 만큼 기둥이 어긋난다.
 */
const CONTENT_COLUMN = 'mx-auto w-full max-w-6xl px-6'

export default function RootLayout() {
  const { user } = useCurrentUser()
  const { studySlug } = useParams()
  const navigate = useNavigate()
  const [recordDrawerOpen, setRecordDrawerOpen] = useState(false)
  const recordDrawer: RecordDrawerContext = {
    open: recordDrawerOpen,
    setOpen: setRecordDrawerOpen,
  }

  // 헤더 높이가 늘었다 줄었다 하므로(스터디 탭 유무 등) 재서 변수로 내려준다 —
  // "내 메모" 드로어가 헤더 바로 아래부터 정확히 시작하게 하려고.
  const headerRef = useRef<HTMLElement>(null)
  const [headerHeight, setHeaderHeight] = useState(0)
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setHeaderHeight(entry.contentRect.height))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const { data: studies = [] } = useQuery({
    queryKey: ['myStudies', user?.id],
    queryFn: () => getMyStudies(),
    enabled: !!user,
  })

  const current = studies.find((s) => s.slug === studySlug) ?? null

  return (
    <div
      className="flex min-h-full flex-col"
      style={{ '--header-h': `${headerHeight}px` } as CSSProperties}
    >
      <header
        ref={headerRef}
        className="sticky top-0 z-10 bg-white/90 shadow-[0_1px_0_rgb(15_23_42/0.07)] backdrop-blur-xl"
      >
        {/* 배경과 아래 테두리는 화면 끝까지 가고, 내용만 본문과 같은 기둥에 선다 */}
        <div className={`${CONTENT_COLUMN} flex items-center gap-4 py-4`}>
          <Link
            to="/app"
            className="group flex items-baseline gap-1.5 font-serif text-xl font-semibold tracking-[-0.045em]"
          >
            <span>mirelab</span>
            <span
              className="size-1.5 rounded-full bg-[#39725f] transition-transform group-hover:scale-125"
              aria-hidden
            />
          </Link>

          {/* 스터디가 하나뿐이면 전환기 대신 이름만. 스터디 밖(내 서재)에서도 돌아갈 길이 필요하다 */}
          {studies.length > 1 ? (
            <select
              value={current?.slug ?? ''}
              onChange={(e) => navigate(`/${e.target.value}`)}
              className="app-input min-h-8 cursor-pointer py-1 text-xs"
              aria-label="스터디 고르기"
            >
              {!current && <option value="">스터디 고르기</option>}
              {studies.map((s) => (
                <option key={s.id} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : (
            studies[0] && (
              <span className="flex items-center gap-4">
                <span className="text-neutral-300" aria-hidden>
                  /
                </span>
                <Link
                  to={`/${studies[0].slug}`}
                  className={`text-sm ${
                    current ? 'text-neutral-500' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {studies[0].name}
                </Link>
              </span>
            )
          )}

          {/* 관리자용 "멤버 관리"도 프로필 메뉴 안으로 들어갔다 — 헤더에는 종과 아바타만 남는다 */}
          <div className="ml-auto flex items-center gap-3">
            {user && (
              <>
                <NotificationsMenu />
                <UserMenu user={user} shelfTo={`/@${user.username}`} />
              </>
            )}
          </div>
        </div>

        {current && <StudyNav study={current} />}
      </header>

      <div className="flex flex-1">
        {/*
          "내 메모" 드로어(WorkPage)는 항상 뷰포트 왼쪽 끝에 고정으로 붙는다.
          여기서는 실제로 아무것도 그리지 않고, 화면이 넓을 때(xl 이상) 그
          너비만큼 자리를 미리 비워둬서 <main> 이 오른쪽으로 밀리게 한다.
        */}
        <div
          className={`w-0 flex-none transition-[width] duration-150 ease-out motion-reduce:transition-none ${
            recordDrawerOpen ? 'xl:w-[28rem]' : ''
          }`}
        />
        <main className={`${CONTENT_COLUMN} flex-1 py-8 sm:py-10`}>
          {/*
            화면을 옮기면 맨 위에서 시작하고, 뒤로 가기로 돌아오면 보던 자리로 되돌린다.
            없으면 브라우저가 스크롤을 그대로 물려줘서, 홈에서 한참 내려간 채 '전체보기'를
            누르면 작품 목록의 중간부터 보인다.

            화면 안에서 조건만 바뀌는 이동(작품 목록의 필터)은 새 화면이 아니므로 각자
            `preventScrollReset` 으로 빠져나간다.
          */}
          <ScrollRestoration />
          <Outlet context={recordDrawer} />
        </main>
      </div>

      <footer className="py-7">
        <p className={`${CONTENT_COLUMN} text-xs text-neutral-400`}>mirelab · 함께 남기는 기록</p>
      </footer>

      {/*
        오른쪽 아래에 뜨는 것들을 한 스택에 모은다 — 페이지가 얹는 플로팅 버튼이
        위, 다음 모임 카드가 아래. 각자 fixed 로 자리를 잡으면 서로 겹친다.
      */}
      <FloatingStack>
        <ThisSessionBanner study={current} />
      </FloatingStack>
    </div>
  )
}

function StudyNav({ study }: { study: Study }) {
  const base = `/${study.slug}`

  // 홈(책장)을 스터디의 얼굴로 두고, 자주 쓰는 기록 축만 전면에 둔다.
  // "내 서재" 는 여기 없다 — 다 같이 보는 것들 사이에 개인 화면이 끼면 축이 섞인다.
  // 프로필 사진 메뉴(UserMenu)로 옮겼다.
  const items = study.hasWorks
    ? [
        { to: base, label: '홈', end: true },
        { to: `${base}/books`, label: '작품 목록', end: true },
        { to: `${base}/sessions`, label: '일정', end: true },
      ]
    : [
        { to: base, label: '홈', end: true },
        { to: `${base}/sessions`, label: '일정', end: true },
      ]

  return (
    <div>
      {/* 탭도 위 막대·본문과 같은 기둥에 선다 — 로고 바로 아래에서 시작해야 한 줄로 읽힌다 */}
      <nav className={`${CONTENT_COLUMN} flex gap-7 overflow-x-auto text-sm`}>
        {items.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative py-2.5 whitespace-nowrap transition-colors ${
                isActive
                  ? 'font-medium text-neutral-900 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[#39725f]'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
