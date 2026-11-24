import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { getPost, PostApiError, postErrorMessage } from '@/src/services/postApi'
import { PostMeta } from '@/src/components/PostMeta'
import { ApiErrorState } from '@/src/components/ApiErrorState'
import type { Post } from '@/src/types/post'
import { PostActions } from '@/src/components/PostActions'
import { PostViewCounter } from '@/src/components/PostViewCounter'

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <div className="reading-layout">
      <Link href="/posts" className="back-link">← 모든 이야기</Link>
      <article className="paper">
        <span className="eyebrow">우리의 일상 · #{String(post.id).padStart(2, '0')}</span>
        <h1 className="article-title">{post.title}</h1>
        <PostMeta post={post} viewCount={<PostViewCounter key={post.id} postId={post.id} initialViews={post.views} />} />
        <div className="article-content">{post.content}</div>
        <p className="article-note">이름은 달라도, 공감하는 마음은 같으니까요.</p>
        <PostActions key={post.id} postId={post.id} />
      </article>
      <div className="page-actions"><Link href="/posts" className="button secondary">목록으로</Link>
        <Link href="/posts/new" className="button primary">나도 이야기 쓰기 ↗</Link></div>
    </div>
  )
}
