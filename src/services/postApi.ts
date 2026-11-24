import type {
  ApiErrorResponse, CreatePostRequest, CreatePostResponse,
  ListPostsRequest, ListPostsResponse, Post, PostSummary,
  RecordPostVisitRequest, RecordPostVisitResponse,
  UpdatePostRequest, UpdatePostResponse,
} from '@/src/types/post'
import { validatePost } from '../lib/postValidation'

export class PostApiError extends Error {
  readonly status: number

  constructor(message: string, status = 0) {
    super(message)
    this.name = 'PostApiError'
    this.status = status
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSummary(value: unknown): value is PostSummary {
  return isRecord(value) && Number.isSafeInteger(value.id) && Number(value.id) > 0
    && typeof value.title === 'string' && value.author === '익명'
    && typeof value.createdAt === 'string' && Number.isFinite(Date.parse(value.createdAt))
    && Number.isSafeInteger(value.views) && Number(value.views) >= 0
}

function isPost(value: unknown): value is Post {
  return isSummary(value) && 'content' in value && typeof value.content === 'string'
}

function isList(value: unknown): value is ListPostsResponse {
  return isRecord(value) && Array.isArray(value.posts) && value.posts.every(isSummary)
    && Number.isSafeInteger(value.total) && Number(value.total) >= 0
    && Number.isSafeInteger(value.page) && Number(value.page) >= 1
    && Number.isInteger(value.size) && Number(value.size) >= 1 && Number(value.size) <= 50
}

function isCreated(value: unknown): value is CreatePostResponse {
  return isRecord(value) && isPost(value.post)
    && typeof value.editToken === 'string' && /^[a-f0-9]{64}$/.test(value.editToken)
}

function isApiError(value: unknown): value is ApiErrorResponse {
  return isRecord(value) && typeof value.message === 'string'
}

// Only server-rendered reads use this private environment variable.
function serverUrl(path: string): string {
  const baseUrl = process.env.API_BASE_URL
  if (!baseUrl) throw new PostApiError('API 서버 주소가 설정되지 않았습니다. API_BASE_URL을 확인해 주세요.')
  try {
    const url = new URL(path, baseUrl)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid protocol')
    return url.toString()
  } catch {
    throw new PostApiError('API 서버 주소 형식이 올바르지 않습니다. API_BASE_URL을 확인해 주세요.')
  }
}

async function request<T>(url: string, isValid: (value: unknown) => value is T, init?: RequestInit): Promise<T> {
  let response: Response
  let body: unknown
  try {
    response = await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(10000) })
    // A successful DELETE has no JSON body.
    body = response.status === 204 ? undefined : await response.json().catch(() => null)
  } catch {
    throw new PostApiError(init?.method === 'POST'
      ? '등록 결과를 확인하지 못했습니다. 네트워크 연결을 확인하고 목록에서 등록 여부를 확인해 주세요.'
      : init?.method === 'PATCH' || init?.method === 'DELETE'
        ? '변경 결과를 확인하지 못했습니다. 연결을 확인하고 목록에서 처리 여부를 확인해 주세요.'
        : '게시글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
  }
  if (!response.ok) {
    throw new PostApiError(isApiError(body) ? body.message : `요청에 실패했습니다. (HTTP ${response.status})`, response.status)
  }
  if (!isValid(body)) throw new PostApiError('API 응답 형식이 올바르지 않습니다. 잠시 후 다시 확인해 주세요.')
  return body
}

export async function getPosts(query: ListPostsRequest = {}): Promise<ListPostsResponse> {
  const params = new URLSearchParams()
  if (query.q !== undefined) params.set('q', query.q)
  if (query.page !== undefined) params.set('page', String(query.page))
  if (query.size !== undefined) params.set('size', String(query.size))
  const suffix = params.size ? `?${params}` : ''
  return request(serverUrl(`/api/posts${suffix}`), isList)
}

export async function getPost(id: string): Promise<Post | null> {
  try {
    // Reads, prefetches and Server Component re-renders must never count a visit.
    return await request(serverUrl(`/api/posts/${encodeURIComponent(id)}?view=0`), isPost)
  } catch (error) {
    if (error instanceof PostApiError && error.status === 404) return null
    throw error
  }
}

export async function recordPostVisit(id: number, input: RecordPostVisitRequest): Promise<RecordPostVisitResponse> {
  return request(`/api/posts/${id}/visits`, (value): value is RecordPostVisitResponse =>
    isRecord(value) && Number.isSafeInteger(value.views) && Number(value.views) >= 0, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })
}

function authorization(editToken: string): string {
  if (!/^[a-f0-9]{64}$/.test(editToken)) throw new PostApiError('관리 토큰이 필요합니다. 글을 작성한 브라우저에서 시도해 주세요.', 401)
  return `Bearer ${editToken}`
}

export async function updatePost(id: number, input: UpdatePostRequest, editToken: string): Promise<UpdatePostResponse> {
  const validationError = validatePost(input)
  if (validationError) throw new PostApiError(validationError, 400)
  return request(`/api/posts/${id}`, isPost, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: authorization(editToken) },
    body: JSON.stringify({ title: input.title.trim(), content: input.content.trim() }),
  })
}

export async function deletePost(id: number, editToken: string): Promise<void> {
  await request(`/api/posts/${id}`, (value): value is undefined => value === undefined, {
    method: 'DELETE', headers: { Authorization: authorization(editToken) },
  })
}

export async function createPost(input: CreatePostRequest): Promise<CreatePostResponse> {
  const validationError = validatePost(input)
  if (validationError) throw new PostApiError(validationError, 400)
  return request('/api/posts', isCreated, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: input.title.trim(), content: input.content.trim() }),
  })
}

export function postErrorMessage(error: unknown): string {
  return error instanceof PostApiError ? error.message : '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}
