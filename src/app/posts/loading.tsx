export default function PostsLoading() {
  return <section className="empty-state" role="status" aria-live="polite" aria-busy="true">
    <span className="loading-spinner" aria-hidden="true" /><p>이야기를 불러오는 중입니다…</p>
  </section>
}
