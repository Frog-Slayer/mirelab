import { createBrowserRouter } from 'react-router'
import RootLayout from '@/components/layout/RootLayout'
import RequireAuth, { RequireAdmin } from '@/components/RequireAuth'
import SchedulePage from '@/pages/SchedulePage'
import WorkPage from '@/pages/WorkPage'
import PostPage from '@/pages/PostPage'
import PostEditorPage from '@/pages/PostEditorPage'
import ShelfWorkPage from '@/pages/ShelfWorkPage'
import AdminMembersPage from '@/pages/AdminMembersPage'
import SettingsPage from '@/pages/SettingsPage'
import LoginPage from '@/pages/LoginPage'
import AuthCallbackPage from '@/pages/AuthCallbackPage'
import SignupPage from '@/pages/SignupPage'
import NotFoundPage from '@/pages/NotFoundPage'
import LandingPage from '@/pages/LandingPage'
import { StudyHomeRedirect } from '@/components/RequireStudyMember'
import { IdentityBooks, IdentityGuard, IdentityHome, MyBlogRedirect } from '@/routes/IdentityRoutes'

/** 스터디 slug 로 쓸 수 없는 이름 — 전역 경로와 부딪힌다 */
export const RESERVED_SLUGS = ['app', 'diary', 'settings', 'login', 'signup', 'api', 'admin', 'new']

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  // 로그인 관련 화면은 RootLayout 밖 — 헤더에 스터디 전환기와 로그아웃이 있어서,
  // 아직 로그인하지 않은 사람에게 보여줄 것이 없다.
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RootLayout />,
        children: [
          { path: 'app', element: <StudyHomeRedirect /> },
          // 스터디와 무관한 내 계정 설정. RESERVED_SLUGS 의 'settings' 가 slug 충돌을 막는다.
          { path: 'settings', element: <SettingsPage /> },
          // 전역 관리 화면. RESERVED_SLUGS 에 'admin' 이 있어 스터디 slug 와 안 부딪힌다.
          {
            path: 'admin/members',
            element: <RequireAdmin />,
            children: [{ index: true, element: <AdminMembersPage /> }],
          },
          {
            // 첫 세그먼트 전체를 받는다. @로 시작하면 블로그 username, 아니면 스터디 slug다.
            // React Router는 `@:username` 같은 부분 동적 세그먼트를 지원하지 않아 여기서 가른다.
            path: ':studySlug',
            element: <IdentityGuard />,
            children: [
              { index: true, element: <IdentityHome /> },
              { path: 'books', element: <IdentityBooks /> },
              { path: 'posts/:postId', element: <PostPage /> },
              { path: 'posts/:postId/edit', element: <PostEditorPage /> },
              { path: 'sessions', element: <SchedulePage /> },
              { path: 'books/:workId', element: <WorkPage /> },
              // 내 서재 — 스터디 안에 있지만 개인화된 저장 공간이라 개인 기준으로 보여준다.
              { path: 'shelf', element: <MyBlogRedirect /> },
              { path: 'shelf/:workId', element: <ShelfWorkPage /> },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
