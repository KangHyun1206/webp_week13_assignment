'use server'

import { revalidatePath } from 'next/cache'

export async function refreshPostList(): Promise<void> {
  revalidatePath('/posts')
}

// Mutations and authorization stay in the provided REST API.
// This action only invalidates frontend routes after a successful mutation.
export async function refreshPostRoutes(id: number): Promise<void> {
  if (!Number.isSafeInteger(id) || id < 1) return
  revalidatePath('/posts')
  revalidatePath(`/posts/${id}`)
  revalidatePath(`/posts/${id}/edit`)
}
