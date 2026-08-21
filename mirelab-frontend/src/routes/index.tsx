import { createBrowserRouter } from 'react-router'
import RootLayout from '@/components/layout/RootLayout'
import RequireAuth, { RequireAdmin } from '@/components/RequireAuth'
import SchedulePage from '@/pages/SchedulePage'
import HallOfFamePage from '@/pages/HallOfFamePage'
import WorkPage from '@/pages/WorkPage'
import ShelfPage from '@/pages/ShelfPage'
import ShelfWorkPage from '@/pages/ShelfWorkPage'
import AdminMembersPage from '@/pages/AdminMembersPage'
import LoginPage from '@/pages/LoginPage'
import AuthCallbackPage from '@/pages/AuthCallbackPage'
import SignupPage from '@/pages/SignupPage'
import NotFoundPage from '@/pages/NotFoundPage'
import RequireStudyMember, { StudyHomeRedirect } from '@/components/RequireStudyMember'

/** 스터디 slug 로 쓸 수 없는 이름 — 전역 경로와 부딪힌다 */
export const RESERVED_SLUGS = ['diary', 'settings', 'login', 'signup', 'api', 'admin', 'new']

export const router = createBrowserRouter([
  // 로그인 관련 화면은 RootLayout 밖 — 헤더에 스터디 전환기와 로그아웃이 있어서,
  // 아직 로그인하지 않은 사람에게 보여줄 것이 없다.
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <RootLayout />,
        children: [
          { index: true, element: <StudyHomeRedirect /> },
          // 전역 관리 화면. RESERVED_SLUGS 에 'admin' 이 있어 스터디 slug 와 안 부딪힌다.
          { path: 'admin/members', element: <RequireAdmin />, children: [
            { index: true, element: <AdminMembersPage /> },
          ] },
          {
            // 스터디 slug 가 최상위를 차지한다. React Router 는 정적 세그먼트를
            // 동적보다 먼저 매칭하므로 전역 경로를 나중에 추가해도 안전하지만,
            // slug 를 사용자가 정하게 되면 RESERVED_SLUGS 로 막아야 한다.
            path: ':studySlug',
            element: <RequireStudyMember />,
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
    ],
  },
])
