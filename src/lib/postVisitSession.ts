export interface PostVisitSession {
  pathname: string
  id: string
}

export function createPostVisitSession(createId: () => string) {
  let current: PostVisitSession | null = null
  return {
    navigate(pathname: string, restoredDocument = false): PostVisitSession {
      if (!current || current.pathname !== pathname || restoredDocument) {
        current = { pathname, id: createId() }
      }
      return current
    },
  }
}
