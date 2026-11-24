import type { Metadata } from 'next'
import Link from 'next/link'
import { PostForm } from '@/src/components/PostForm'

export const metadata: Metadata = { title: '새 이야기' }

export default function NewPostPage() {
  return (
    <div className="reading-layout">
      <Link href="/posts" className="back-link">← 모든 이야기</Link>
      <div className="writing-heading"><span className="eyebrow">WRITE YOUR STORY</span>
        <h1>어떤 이야기를 나누고 싶나요?</h1><p>멋진 문장이 아니어도 괜찮아요. 당신의 이야기를 들려주세요.</p></div>
      <PostForm />
    </div>
  )
}
