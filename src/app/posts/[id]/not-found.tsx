import Link from 'next/link'

export default function PostNotFound() {
  return <div className="empty-state"><span className="eyebrow">404 · NOT FOUND</span>
    <h1>이야기를 찾을 수 없어요.</h1><p>게시글 주소를 다시 확인해 주세요.</p>
    <Link href="/posts" className="button primary">게시판으로 돌아가기</Link></div>
}
