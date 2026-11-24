import type { SyncMode } from '../../hooks/useRealtime'

/** Kleur is nooit de enige drager: er staat altijd tekst naast. */
export function SyncIndicator({ mode }: { mode: SyncMode }) {
  if (mode === 'off') return null

  const live = mode === 'live'
  return (
    <p className="flex items-center gap-2 text-sm text-ink-soft">
      <span
        aria-hidden="true"
        className={[
          'size-2.5 rounded-full',
          live ? 'bg-blue' : 'border border-ink-soft bg-bg',
        ].join(' ')}
      />
      {live ? 'Live' : 'Vernieuwt elke 4 s'}
    </p>
  )
}
