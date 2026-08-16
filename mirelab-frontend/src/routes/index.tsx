import { createBrowserRouter, createHashRouter, Navigate } from 'react-router'
import RootLayout from '@/components/layout/RootLayout'
import SessionsPage from '@/pages/SessionsPage'
import SessionFormPage from '@/pages/SessionFormPage'
import SessionPage from '@/pages/SessionPage'
import LibraryPage from '@/pages/LibraryPage'
import HallOfFamePage from '@/pages/HallOfFamePage'
import WorkPage from '@/pages/WorkPage'
import ShelfPage from '@/pages/ShelfPage'
import ShelfWorkPage from '@/pages/ShelfWorkPage'
import SlotSettingsPage from '@/pages/SlotSettingsPage'
import NotFoundPage from '@/pages/NotFoundPage'

// 데모 빌드(단일 HTML)는 임의의 경로에 얹히므로 pushState 를 쓰면 안 된다.
const createRouter = import.meta.env.VITE_DEMO ? createHashRouter : createBrowserRouter

/** 스터디 slug 로 쓸 수 없는 이름 — 전역 경로와 부딪힌다 */
export const RESERVED_SLUGS = [
  'shelf',
  'diary',
  'settings',
  'login',
  'signup',
  'api',
  'admin',
  'new',
]

export const router = createRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/reading" replace /> },
      { path: 'shelf', element: <ShelfPage /> },
      { path: 'shelf/:workId', element: <ShelfWorkPage /> },
      {
        // 스터디 slug 가 최상위를 차지한다. React Router 는 정적 세그먼트를
        // 동적보다 먼저 매칭하므로 전역 경로를 나중에 추가해도 안전하지만,
        // slug 를 사용자가 정하게 되면 RESERVED_SLUGS 로 막아야 한다.
        path: ':studySlug',
        children: [
          { index: true, element: <HallOfFamePage /> },
          { path: 'sessions', element: <SessionsPage /> },
          { path: 'sessions/new', element: <SessionFormPage /> },
          { path: 'w/:sessionId', element: <SessionPage /> },
          { path: 'library', element: <LibraryPage /> },
          { path: 'books/:workId', element: <WorkPage /> },
          { path: 'settings/slots', element: <SlotSettingsPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
