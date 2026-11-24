const key = (id: number) => `post:${id}:editToken`
export const tokenChangedEvent = 'post-token-changed'

export function readPostToken(id: number): string | null {
  try {
    const value = window.localStorage.getItem(key(id))
    return value && /^[a-f0-9]{64}$/.test(value) ? value : null
  } catch {
    return null
  }
}

export function savePostToken(id: number, token: string): void {
  window.localStorage.setItem(key(id), token)
  window.dispatchEvent(new Event(tokenChangedEvent))
}

export function removePostToken(id: number): void {
  try {
    window.localStorage.removeItem(key(id))
    window.dispatchEvent(new Event(tokenChangedEvent))
  } catch {
    // Deletion has already succeeded on the backend.
  }
}
