export const POSTS_PAGE_SIZE = 10

export interface PostSearchParams {
  q?: string | string[]
  page?: string | string[]
}

export function parsePostSearch(params: PostSearchParams): { q: string; page: number } {
  const q = (typeof params.q === 'string' ? params.q : params.q?.[0] ?? '').trim()
  const pageValue = typeof params.page === 'string' ? params.page : params.page?.[0] ?? '1'
  const number = /^\d+$/.test(pageValue) ? Number(pageValue) : NaN
  const page = Number.isSafeInteger(number) && number >= 1 && Number.isSafeInteger(number * POSTS_PAGE_SIZE) ? number : 1
  return { q, page }
}

export function postListHref(q: string, page = 1): string {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (page > 1) params.set('page', String(page))
  return params.size ? `/posts?${params}` : '/posts'
}
