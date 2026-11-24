import Link from 'next/link'

export default function NotFound() {
  return <section className="empty-state"><span className="eyebrow">404 · NOT FOUND</span>
    <h1>페이지를 찾을 수 없어요.</h1><p>주소를 확인하거나 게시판에서 이야기를 찾아 주세요.</p>
    <Link href="/posts" className="button primary">게시판으로 돌아가기</Link>
  </section>
}
