import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Header } from '@/src/components/Header'
import { PostVisitProvider } from '@/src/components/PostVisitProvider'
import './globals.css'

export const metadata: Metadata = {
  title: { default: '이음 | 익명 게시판', template: '%s | 이음' },
  description: '이름 없이 나누는 일상의 이야기, 익명 게시판 이음입니다.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <a className="skip-link" href="#main">본문 바로가기</a>
        <Header />
        <main id="main" className="container"><PostVisitProvider>{children}</PostVisitProvider></main>
        <footer className="site-footer container">
          <span>이름 없이, 마음을 잇다.</span>
          <span>이음 · Anonymous Message Board</span>
        </footer>
      </body>
    </html>
  )
}
