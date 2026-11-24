import type { ReactNode } from 'react'

export function VisuallyHidden({ children, live }: { children: ReactNode; live?: 'polite' | 'assertive' }) {
  return (
    <span className="sr-only" aria-live={live}>
      {children}
    </span>
  )
}
