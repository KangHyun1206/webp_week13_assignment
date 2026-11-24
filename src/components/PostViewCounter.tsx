'use client'

import { useEffect, useRef, useState } from 'react'
import { recordPostVisit } from '@/src/services/postApi'
import type { RecordPostVisitResponse } from '@/src/types/post'
import { refreshPostList } from '@/src/app/posts/actions'
import { usePostVisitId } from './PostVisitProvider'

export function PostViewCounter({ postId, initialViews }: { postId: number; initialViews: number }) {
  const visitId = usePostVisitId(postId)
  const [views, setViews] = useState(initialViews)
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const inFlight = useRef<{ key: string; promise: Promise<RecordPostVisitResponse> } | null>(null)

  useEffect(() => {
    if (!visitId) return
    const currentVisitId = visitId
    let active = true
    let started = false
    function recordWhenVisible() {
      if (started || document.visibilityState !== 'visible') return
      started = true
      setFailed(false)
      const key = `${postId}:${visitId}:${retry}`
      // Reuse the in-flight request on React Strict Mode's effect replay.
      if (inFlight.current?.key !== key) {
        inFlight.current = { key, promise: recordPostVisit(postId, { visitId: currentVisitId }) }
      }
      void inFlight.current.promise.then((result) => {
        if (!active) return
        setViews(result.views)
        // A list cached before opening this post should show the new count.
        void refreshPostList().catch(() => undefined)
      }).catch(() => {
        if (active) setFailed(true)
      })
    }
    recordWhenVisible()
    document.addEventListener('visibilitychange', recordWhenVisible)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', recordWhenVisible)
    }
  }, [postId, visitId, retry])

  return <span className="view-counter">
    <span aria-live="polite">조회 {Math.max(initialViews, views).toLocaleString('ko-KR')}</span>
    {failed && <span className="view-error" role="status"> 조회수를 반영하지 못했어요.{' '}
      <button type="button" className="retry-visit" onClick={() => { setFailed(false); setRetry((value) => value + 1) }}>다시 시도</button></span>}
  </span>
}
