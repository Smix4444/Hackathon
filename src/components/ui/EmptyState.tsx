import type { ReactNode } from 'react'

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-block border border-line bg-surface px-5 py-6 text-ink-soft">{children}</p>
  )
}
