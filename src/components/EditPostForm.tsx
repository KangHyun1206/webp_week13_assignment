'use client'

import Link from 'next/link'
import type { Post } from '@/src/types/post'
import { PostForm } from './PostForm'
import { usePostToken } from './usePostToken'

export function EditPostForm({ post }: { post: Post }) {
  const editToken = usePostToken(post.id)
  if (!editToken) return <section className="paper empty-state">
    <h2>이 글의 관리 토큰이 없어요.</h2>
    <p>글을 작성한 브라우저에서 수정해 주세요. 브라우저 데이터를 지우면 관리 권한을 복구할 수 없습니다.</p>
    <Link href={`/posts/${post.id}`} prefetch={false} className="button secondary">상세로 돌아가기</Link>
  </section>
  return <PostForm mode="edit" post={post} editToken={editToken} />
}
