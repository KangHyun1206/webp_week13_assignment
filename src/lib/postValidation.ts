import type { CreatePostRequest } from '@/src/types/post'

export function validatePost(input: CreatePostRequest): string | null {
  const title = input.title.trim()
  const content = input.content.trim()
  if (title.length < 1 || title.length > 100) return '제목은 앞뒤 공백을 제거한 뒤 1~100자로 입력해 주세요.'
  if (content.length < 1 || content.length > 5000) return '본문은 앞뒤 공백을 제거한 뒤 1~5,000자로 입력해 주세요.'
  return null
}
