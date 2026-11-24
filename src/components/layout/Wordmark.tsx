import { APP_NAME } from '../../config'

/** Eigen merkteken: drie balken in blauw, koraal en zonnegeel. */
export function Wordmark({ as = 'span' }: { as?: 'span' | 'h1' }) {
  const Tag = as
  return (
    <Tag className="flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 shrink-0">
        <rect x="2" y="3" width="20" height="5" rx="2.5" fill="var(--color-blue)" />
        <rect x="2" y="9.5" width="20" height="5" rx="2.5" fill="var(--color-free)" />
        <rect x="2" y="16" width="20" height="5" rx="2.5" fill="var(--color-offer)" />
      </svg>
      {APP_NAME}
    </Tag>
  )
}
