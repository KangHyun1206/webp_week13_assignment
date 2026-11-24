import { PostsBoard } from '@/src/components/PostsBoard'
import { ApiErrorState } from '@/src/components/ApiErrorState'
import { getPosts, PostApiError, postErrorMessage } from '@/src/services/postApi'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { parsePostSearch, postListHref, POSTS_PAGE_SIZE, type PostSearchParams } from '@/src/lib/postListQuery'
import type { ListPostsResponse } from '@/src/types/post'

export default async function PostsPage({ searchParams }: { searchParams: Promise<PostSearchParams> }) {
  await connection()
  const { q, page } = parsePostSearch(await searchParams)
  let result: ListPostsResponse
  try {
    result = await getPosts({ q, page, size: POSTS_PAGE_SIZE })
  } catch (error) {
    if (!(error instanceof PostApiError)) throw error
    return <ApiErrorState message={postErrorMessage(error)} />
  }
  const lastPage = Math.max(1, Math.ceil(result.total / result.size))
  if (page > lastPage) redirect(postListHref(q, lastPage))
  return <PostsBoard {...result} query={q} />
}
