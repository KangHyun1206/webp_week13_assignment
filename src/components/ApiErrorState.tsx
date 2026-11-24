'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export function ApiErrorState({ message }: { message: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <section className="empty-state" role="alert">
      <span className="eyebrow">잠시 연결이 어려워요</span>
      <h1>이야기를 불러오지 못했어요.</h1>
      <p>{message}</p>
      <div className="status-actions">
        <button className="button primary" disabled={isPending}
          onClick={() => startTransition(() => router.refresh())}>{isPending ? '다시 불러오는 중…' : '다시 시도'}</button>
        <Link href="/posts" className="button secondary">목록으로</Link>
      </div>
    </section>
  )
}
