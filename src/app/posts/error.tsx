'use client'

import Link from 'next/link'
import { useTransition } from 'react'

export default function PostsError({ retry }: { error: unknown; retry: () => void }) {
  const [isPending, startTransition] = useTransition()
  return <section className="empty-state" role="alert">
    <span className="eyebrow">잠시 문제가 생겼어요</span><h1>화면을 표시하지 못했습니다.</h1>
    <p>잠시 후 다시 시도해 주세요.</p>
    <div className="status-actions">
      <button className="button primary" disabled={isPending} onClick={() => startTransition(() => retry())}>{isPending ? '다시 불러오는 중…' : '다시 시도'}</button>
      <Link href="/posts" className="button secondary">목록으로</Link>
    </div>
  </section>
}
