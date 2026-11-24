import { db } from './board'
import type { RecordPostVisitResponse } from '@/src/types/post'

// Keep the supplied CRUD API untouched. Persist deduplication across retries,
// concurrent requests, hot reloads and server restarts in the same database.
export function recordVisit(postId: number, visitId: string): RecordPostVisitResponse | null {
  const connection = db()
  connection.exec(`CREATE TABLE IF NOT EXISTS post_visits (
    postId INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    visitId TEXT NOT NULL,
    PRIMARY KEY (postId, visitId)
  )`)
  connection.exec('BEGIN IMMEDIATE')
  try {
    if (!connection.prepare('SELECT id FROM posts WHERE id=?').get(postId)) {
      connection.exec('COMMIT')
      return null
    }
    const inserted = connection.prepare('INSERT OR IGNORE INTO post_visits(postId,visitId) VALUES(?,?)').run(postId, visitId)
    if (inserted.changes) connection.prepare('UPDATE posts SET views=views+1 WHERE id=?').run(postId)
    const post = connection.prepare('SELECT views FROM posts WHERE id=?').get(postId)
    connection.exec('COMMIT')
    return { views: Number(post?.views) }
  } catch (error) {
    connection.exec('ROLLBACK')
    throw error
  }
}
