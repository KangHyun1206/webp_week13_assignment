export interface PostSummary {
  id: number
  title: string
  author: '익명'
  createdAt: string
  views: number
}

export interface Post extends PostSummary {
  content: string
}

export interface ListPostsRequest {
  q?: string
  page?: number
  size?: number
}

export interface ListPostsResponse {
  posts: PostSummary[]
  total: number
  page: number
  size: number
}

export interface CreatePostRequest {
  title: string
  content: string
}

export interface CreatePostResponse {
  post: Post
  editToken: string
}

export type UpdatePostRequest = CreatePostRequest
export type UpdatePostResponse = Post

export interface RecordPostVisitRequest {
  visitId: string
}

export interface RecordPostVisitResponse {
  views: number
}

export interface ApiErrorResponse {
  message: string
}
