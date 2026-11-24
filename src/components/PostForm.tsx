'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, type FormEvent } from 'react'
import { createPost, updatePost, postErrorMessage } from '@/src/services/postApi'
import { validatePost } from '@/src/lib/postValidation'
import { savePostToken } from '@/src/lib/postToken'
import { refreshPostRoutes } from '@/src/app/posts/actions'
import type { Post } from '@/src/types/post'

type PostFormProps = { mode?: 'create' } | { mode: 'edit'; post: Post; editToken: string }

export function PostForm(props: PostFormProps = {}) {
  const router = useRouter()
  const initialPost = props.mode === 'edit' ? props.post : null
  const [title, setTitle] = useState(initialPost?.title ?? '')
  const [content, setContent] = useState(initialPost?.content ?? '')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitting = useRef(false)
  const [createdId, setCreatedId] = useState<number | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || createdId !== null) return
    const validationError = validatePost({ title, content })
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    submitting.current = true
    setIsSubmitting(true)
    try {
      let savedId: number
      if (props.mode === 'edit') {
        const post = await updatePost(props.post.id, { title, content }, props.editToken)
        savedId = post.id
        setCreatedId(savedId)
      } else {
        const result = await createPost({ title, content })
        savedId = result.post.id
        setCreatedId(savedId)
        try {
          savePostToken(savedId, result.editToken)
        } catch {
          // Do not submit the already-created post a second time.
          await refreshPostRoutes(savedId).catch(() => undefined)
          setError('글은 등록되었지만 관리 토큰을 브라우저에 저장하지 못했습니다. 이 브라우저에서는 이후 수정·삭제가 어려울 수 있습니다.')
          return
        }
      }
      // Creating a post is not a read: let the user open it from the list.
      const destination = props.mode === 'edit' ? `/posts/${savedId}` : '/posts'
      try {
        await refreshPostRoutes(savedId)
      } catch {
        window.location.assign(destination)
        return
      }
      router.replace(destination)
    } catch (requestError) {
      setError(postErrorMessage(requestError))
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <form className="paper post-form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
        <fieldset disabled={isSubmitting || createdId !== null}>
        <div className="form-author"><span className="avatar" aria-hidden="true">익</span>
          <div><strong>익명으로 작성해요</strong><p>이름을 밝히지 않아도 충분해요.</p></div></div>
        <div className="field"><label htmlFor="title">제목</label>
          <input id="title" name="title" value={title} maxLength={100} required
            placeholder="이야기의 제목을 입력해 주세요" onChange={(event) => { setTitle(event.target.value); setError('') }} />
          <span className="field-count">{title.length} / 100</span></div>
        <div className="field"><label htmlFor="content">내용</label>
          <textarea id="content" name="content" value={content} maxLength={5000} required rows={10}
            placeholder="오늘의 생각, 일상, 고민을 자유롭게 남겨 주세요."
            onChange={(event) => { setContent(event.target.value); setError('') }} />
          <span className="field-count">{content.length} / 5,000</span></div>
        </fieldset>
        <p className="demo-notice">글은 익명으로 등록됩니다. 개인정보가 포함되지 않았는지 확인해 주세요.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        {createdId !== null ? <div role="status"><p>이야기가 {props.mode === 'edit' ? '수정' : '등록'}되었습니다.</p>
          <Link href={`/posts/${createdId}`} prefetch={false} className="button primary">저장한 글 보기 ↗</Link></div>
          : <div className="page-actions"><Link href={initialPost ? `/posts/${initialPost.id}` : '/posts'} prefetch={false} className="button secondary">취소</Link>
            <button type="submit" className="button primary" disabled={isSubmitting}>{isSubmitting ? '저장 중…' : props.mode === 'edit' ? '수정 내용 저장 ↗' : '이야기 등록 ↗'}</button></div>}
      </form>
    </>
  )
}
