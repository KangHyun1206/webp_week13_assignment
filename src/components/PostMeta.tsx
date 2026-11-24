import type { PostSummary } from '@/src/types/post'
import { formatDate } from '@/src/lib/formatDate'
import type { ReactNode } from 'react'

export function PostMeta({ post, viewCount }: { post: PostSummary; viewCount?: ReactNode }) {
  return (
    <div className="post-meta">
      <span className="author"><span className="avatar" aria-hidden="true">익</span>{post.author}</span>
      <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
      {viewCount ?? <span>조회 {post.views.toLocaleString('ko-KR')}</span>}
    </div>
  )
}
