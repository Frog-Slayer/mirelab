import { createBrowserRouter, createHashRouter, Navigate } from 'react-router'
import RootLayout from '@/components/layout/RootLayout'
import SchedulePage from '@/pages/SchedulePage'
import HallOfFamePage from '@/pages/HallOfFamePage'
import WorkPage from '@/pages/WorkPage'
import ShelfPage from '@/pages/ShelfPage'
import ShelfWorkPage from '@/pages/ShelfWorkPage'
import NotFoundPage from '@/pages/NotFoundPage'

// 데모 빌드(단일 HTML)는 임의의 경로에 얹히므로 pushState 를 쓰면 안 된다.
const createRouter = import.meta.env.VITE_DEMO ? createHashRouter : createBrowserRouter

/** 스터디 slug 로 쓸 수 없는 이름 — 전역 경로와 부딪힌다 */
export const RESERVED_SLUGS = ['diary', 'settings', 'login', 'signup', 'api', 'admin', 'new']

export const router = createRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/reading" replace /> },
      {
        // 스터디 slug 가 최상위를 차지한다. React Router 는 정적 세그먼트를
        // 동적보다 먼저 매칭하므로 전역 경로를 나중에 추가해도 안전하지만,
        // slug 를 사용자가 정하게 되면 RESERVED_SLUGS 로 막아야 한다.
        path: ':studySlug',
        children: [
          { index: true, element: <HallOfFamePage /> },
          { path: 'sessions', element: <SchedulePage /> },
          { path: 'books/:workId', element: <WorkPage /> },
          // 내 서재 — 스터디 안에 있지만 개인화된 저장 공간이라 개인 기준으로 보여준다.
          { path: 'shelf', element: <ShelfPage /> },
          { path: 'shelf/:workId', element: <ShelfWorkPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
