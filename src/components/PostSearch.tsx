import Form from 'next/form'
import Link from 'next/link'

export function PostSearch({ query }: { query: string }) {
  return <Form action="/posts" className="search-form" role="search" key={query}>
    <label htmlFor="post-search">제목 검색</label>
    <div className="search-controls">
      <input id="post-search" name="q" type="search" defaultValue={query} placeholder="찾고 싶은 이야기의 제목" />
      <button type="submit" className="button primary">검색</button>
      {query && <Link href="/posts" className="button secondary">초기화</Link>}
    </div>
  </Form>
}
