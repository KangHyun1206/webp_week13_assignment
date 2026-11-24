import Link from 'next/link'
import { postListHref } from '@/src/lib/postListQuery'

export function Pagination({ page, size, total, query }: { page: number; size: number; total: number; query: string }) {
  const totalPages = Math.max(1, Math.ceil(total / size))
  if (totalPages <= 1) return null
  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
  const end = Math.min(totalPages, start + 4)
  const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index)

  return <nav className="pagination" aria-label="게시글 페이지 이동">
    {page > 1 ? <Link href={postListHref(query, page - 1)} prefetch={false} className="page-link">← 이전</Link>
      : <span className="page-link disabled" aria-disabled="true">← 이전</span>}
    {pages.map((number) => <Link key={number} href={postListHref(query, number)} prefetch={false}
      className={number === page ? 'page-link current' : 'page-link'} aria-current={number === page ? 'page' : undefined}
      aria-label={`${number}페이지`}>{number}</Link>)}
    {page < totalPages ? <Link href={postListHref(query, page + 1)} prefetch={false} className="page-link">다음 →</Link>
      : <span className="page-link disabled" aria-disabled="true">다음 →</span>}
  </nav>
}
