import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { getPost, PostApiError, postErrorMessage } from '@/src/services/postApi'
import { ApiErrorState } from '@/src/components/ApiErrorState'
import { EditPostForm } from '@/src/components/EditPostForm'
import type { Post } from '@/src/types/post'

export const metadata: Metadata = { title: '이야기 수정' }

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  await connection()
  const { id } = await params
  let post: Post | null
  try {
    post = await getPost(id)
  } catch (error) {
    if (!(error instanceof PostApiError)) throw error
    return <ApiErrorState message={postErrorMessage(error)} />
  }
  if (!post) notFound()

  return <div className="reading-layout">
    <Link href={`/posts/${post.id}`} prefetch={false} className="back-link">← 이야기로 돌아가기</Link>
    <div className="writing-heading"><span className="eyebrow">EDIT YOUR STORY</span>
      <h1>이야기를 다듬어 주세요.</h1><p>수정 내용은 저장 후 바로 반영됩니다.</p></div>
    <EditPostForm key={post.id} post={post} />
  </div>
}
