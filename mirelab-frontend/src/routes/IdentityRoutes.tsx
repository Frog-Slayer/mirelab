import { Navigate, Outlet, useParams } from 'react-router'
import RequireStudyMember from '@/components/RequireStudyMember'
import { useCurrentUser } from '@/hooks/currentUser'
import AllWorksPage from '@/pages/AllWorksPage'
import BlogPage from '@/pages/BlogPage'
import HallOfFamePage from '@/pages/HallOfFamePage'

export function MyBlogRedirect() {
  const { user } = useCurrentUser()
  return user ? <Navigate to={`/@${user.username}`} replace /> : null
}

export function IdentityGuard() {
  const { studySlug = '' } = useParams()
  return studySlug.startsWith('@') ? <Outlet /> : <RequireStudyMember />
}

export function IdentityHome() {
  const { studySlug = '' } = useParams()
  return studySlug.startsWith('@') ? <BlogPage tab="posts" /> : <HallOfFamePage />
}

export function IdentityBooks() {
  const { studySlug = '' } = useParams()
  return studySlug.startsWith('@') ? <BlogPage tab="books" /> : <AllWorksPage />
}
