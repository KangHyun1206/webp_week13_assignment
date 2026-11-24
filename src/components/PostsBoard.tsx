import Link from 'next/link'
import type { ListPostsResponse } from '@/src/types/post'
import { PostList } from './PostList'
import { PostSearch } from './PostSearch'
import { Pagination } from './Pagination'

export function PostsBoard({ posts, total, page, size, query }: ListPostsResponse & { query: string }) {
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">ANONYMOUS MESSAGE BOARD</span>
          <h1>당신의 이야기를,<br />이름 없이 편안하게.</h1>
          <p>소소한 일상부터 말 못 했던 마음까지.<br />여기서는 우리 모두 익명입니다.</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="art-label">a little space for your thoughts</span>
          <span className="bubble bubble-one">안녕, 오늘은 어땠어요?</span>
          <span className="bubble bubble-two">그냥 나누고 싶었어요 <span>✳</span></span>
          <span className="art-spark">✳</span>
        </div>
      </section>
      <section className="board-section" aria-labelledby="board-title">
        <div className="section-heading">
          <div><h2 id="board-title">모두의 이야기 <span className="count">{total}</span></h2>
            <p>서로 다른 하루가 모이는 곳</p></div>
          <Link href="/posts/new" className="button primary"><span aria-hidden="true">＋</span> 새 글 쓰기</Link>
        </div>
        <PostSearch query={query} />
        <div className="list-caption"><span>{query ? `“${query}” 제목 검색 결과` : '최신 이야기부터 보여 드려요'}</span>
          <span>{total > 0 ? `${(page - 1) * size + 1}–${(page - 1) * size + posts.length} / ${total}` : '0개의 이야기'}</span></div>
        {posts.length === 0 && query ? <div className="empty-state"><h2>검색 결과가 없어요.</h2>
          <p>다른 제목으로 검색해 보세요.</p><Link href="/posts" className="button secondary">전체 이야기 보기</Link></div>
          : <PostList posts={posts} />}
        <Pagination page={page} size={size} total={total} query={query} />
        <p className="board-note">작은 배려가 편안한 대화를 만듭니다. 서로를 존중하며 이야기를 나눠 주세요.</p>
      </section>
    </>
  )
}
