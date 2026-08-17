import { api } from '@/lib/api'
import type { User } from '@/types'

export function getUsers(): Promise<User[]> {
  return api.get('/users')
}
