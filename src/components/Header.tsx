import Link from 'next/link'
import { Navigation } from './Navigation'

export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/posts" className="brand" aria-label="이음 게시판 홈">
          <span className="brand-mark" aria-hidden="true">&ldquo;</span>
          이음<span className="brand-caption">익명으로 연결되는 우리</span>
        </Link>
        <Navigation />
      </div>
    </header>
  )
}
