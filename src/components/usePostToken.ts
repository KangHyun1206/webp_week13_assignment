'use client'

import { useSyncExternalStore } from 'react'
import { readPostToken, tokenChangedEvent } from '@/src/lib/postToken'

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener(tokenChangedEvent, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(tokenChangedEvent, onChange)
  }
}

export function usePostToken(id: number): string | null {
  return useSyncExternalStore(subscribe, () => readPostToken(id), () => null)
}
