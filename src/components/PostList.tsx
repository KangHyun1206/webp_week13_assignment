import Link from 'next/link'
import type { PostSummary } from '@/src/types/post'
import { PostMeta } from './PostMeta'

export function PostList({ posts }: { posts: readonly PostSummary[] }) {
  if (posts.length === 0) {
    return <div className="empty-state">아직 이야기가 없어요. 첫 이야기를 남겨 주세요.</div>
  }

  return (
    <ul className="post-list">
      {posts.map((post) => (
        <li key={post.id}>
          <Link href={`/posts/${post.id}`} className="post-row" prefetch={false}>
            <span className="post-number">{String(post.id).padStart(2, '0')}</span>
            <div className="post-summary">
              <h2>{post.title}</h2>
              <PostMeta post={post} />
            </div>
            <span className="row-arrow" aria-hidden="true">↗</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
