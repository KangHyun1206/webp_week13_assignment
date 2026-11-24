'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { createPostVisitSession, type PostVisitSession } from '@/src/lib/postVisitSession'

const VisitContext = createContext<PostVisitSession | null>(null)

export function PostVisitProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [tracker] = useState(() => createPostVisitSession(() => crypto.randomUUID()))
  const [visit, setVisit] = useState<PostVisitSession | null>(null)

  useEffect(() => {
    // The provider lives in the root layout, including while visiting the list
    // or edit page. Returning to a cached detail page creates a new visit.
    setVisit(tracker.navigate(pathname))
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) setVisit(tracker.navigate(pathname, true))
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [pathname, tracker])

  return <VisitContext.Provider value={visit}>{children}</VisitContext.Provider>
}

export function usePostVisitId(postId: number): string | null {
  const visit = useContext(VisitContext)
  if (!visit) return null
  const detailMatch = visit.pathname.match(/^\/posts\/(\d+)\/?$/)
  return detailMatch && Number(detailMatch[1]) === postId ? visit.id : null
}
