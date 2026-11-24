'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { deletePost, postErrorMessage } from '@/src/services/postApi'
import { removePostToken } from '@/src/lib/postToken'
import { refreshPostRoutes } from '@/src/app/posts/actions'
import { usePostToken } from './usePostToken'

export function PostActions({ postId }: { postId: number }) {
  const editToken = usePostToken(postId)
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)

  async function handleDelete() {
    if (!editToken || pending.current || deleted) return
    pending.current = true
    setIsDeleting(true)
    setError('')
    try {
      await deletePost(postId, editToken)
      setDeleted(true)
      removePostToken(postId)
      try {
        await refreshPostRoutes(postId)
      } catch {
        window.location.assign('/posts')
        return
      }
      router.replace('/posts')
    } catch (requestError) {
      setError(postErrorMessage(requestError))
    } finally {
      pending.current = false
      setIsDeleting(false)
    }
  }

  if (deleted) return <p role="status">글이 삭제되었습니다. <Link href="/posts">목록으로 이동</Link></p>
  if (!editToken) return <p className="muted owner-note">글을 작성한 브라우저에서 수정·삭제할 수 있습니다.</p>

  return (
    <section className="owner-actions" aria-label="게시글 관리" aria-busy={isDeleting}>
      {confirming ? <div className="delete-confirm">
        <h2>이 이야기를 삭제할까요?</h2><p>삭제한 글은 복구할 수 없습니다.</p>
        <div className="status-actions">
          <button type="button" className="button secondary" disabled={isDeleting} onClick={() => { setConfirming(false); setError('') }}>취소</button>
          <button type="button" className="button danger" disabled={isDeleting} onClick={handleDelete}>{isDeleting ? '삭제 중…' : '삭제 확인'}</button>
        </div>
      </div> : <div className="manage-buttons">
        <Link href={`/posts/${postId}/edit`} prefetch={false} className="button secondary">수정</Link>
        <button type="button" className="button danger-outline" onClick={() => setConfirming(true)}>삭제</button>
      </div>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  )
}
