import { api } from '@/lib/api'
import type { User } from '@/types'

export function updateMyName(name: string): Promise<User> {
  return api.patch('/me', { name })
}

export function uploadMyPicture(image: Blob): Promise<User> {
  const form = new FormData()
  form.append('file', image, 'profile')
  return api.put('/me/picture', form)
}

export function removeMyPicture(): Promise<User> {
  return api.delete('/me/picture')
}
