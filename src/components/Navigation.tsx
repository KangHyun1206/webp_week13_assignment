'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Navigation() {
  const isWriting = usePathname() === '/posts/new'
  return <nav aria-label="주 메뉴">
    <Link href="/posts" className={!isWriting ? 'nav-link active' : 'nav-link'}
      aria-current={!isWriting ? 'page' : undefined}>게시판</Link>
    <Link href="/posts/new" className={isWriting ? 'nav-link active' : 'nav-link'}
      aria-current={isWriting ? 'page' : undefined}>글쓰기 <span aria-hidden="true">↗</span></Link>
  </nav>
}
