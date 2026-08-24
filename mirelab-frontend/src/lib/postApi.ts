import { api } from '@/lib/api'
import type { Post, PostSummary, User } from '@/types'

export interface BlogProfile {
  user: User
  postCount: number
  bookCount: number
}

export function getBlogProfile(username: string): Promise<BlogProfile> {
  return api.get(`/users/${encodeURIComponent(username)}`)
}

export function getUserPosts(username: string): Promise<PostSummary[]> {
  return api.get(`/users/${encodeURIComponent(username)}/posts`)
}

export function getPost(postId: string): Promise<Post> {
  return api.get(`/posts/${postId}`)
}

export function getWorkPosts(workId: string): Promise<PostSummary[]> {
  return api.get(`/works/${workId}/posts`)
}

export function createPost(title = ''): Promise<Post> {
  return api.post('/me/posts', { title })
}

export function updatePost(input: {
  id: string
  title: string
  bodyJson: string | null
  workId: string | null
  sharedStudyIds: string[]
  published: boolean
}): Promise<Post> {
  const { id, ...body } = input
  return api.patch(`/posts/${id}`, body)
}

export function deletePost(postId: string): Promise<void> {
  return api.delete(`/posts/${postId}`)
}
