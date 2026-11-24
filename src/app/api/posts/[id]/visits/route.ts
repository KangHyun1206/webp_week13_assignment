import { recordVisit } from '@/src/server/postVisits'
import { error } from '@/src/server/board'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const postId = Number(id)
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(postId) || postId < 1) return error('게시글을 찾을 수 없습니다.', 404)
  const input: unknown = await request.json().catch(() => null)
  if (!input || typeof input !== 'object' || !('visitId' in input) || typeof input.visitId !== 'string'
    || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.visitId)) {
    return error('올바른 방문 ID가 필요합니다.', 400)
  }
  const result = recordVisit(postId, input.visitId.toLowerCase())
  return result ? Response.json(result, { headers: { 'Cache-Control': 'no-store' } }) : error('게시글을 찾을 수 없습니다.', 404)
}
