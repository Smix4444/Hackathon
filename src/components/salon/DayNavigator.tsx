import { ChevronLeft, ChevronRight } from 'lucide-react'

import { brusselsDayKey, brusselsDayStart, formatDayLabel } from '../../lib/time'

/** Zoveel dagen vooruit kan de salon bladeren. */
export const DAYS_AHEAD = 14

function shift(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + days))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(
    next.getUTCDate(),
  ).padStart(2, '0')}`
}

/** Hoeveel dagen `dayKey` na vandaag ligt. */
export function offsetFromToday(dayKey: string, now: Date): number {
  const today = Date.parse(`${brusselsDayKey(now)}T00:00:00Z`)
  return Math.round((Date.parse(`${dayKey}T00:00:00Z`) - today) / 86_400_000)
}

/**
 * Door de agenda bladeren, dag per dag. Vandaag is de eerste dag;
 * verder terug heeft geen zin, want een plek in het verleden kan je
 * niet meer vrijgeven.
 */
export function DayNavigator({
  dayKey,
  now,
  count,
  onChange,
}: {
  dayKey: string
  now: Date
  /** Aantal afspraken op deze dag, voor de regel eronder. */
  count: number
  onChange: (dayKey: string) => void
}) {
  const offset = offsetFromToday(dayKey, now)
  const date = brusselsDayStart(now, offset)
  const label = formatDayLabel(date, now)

  const arrow =
    'flex size-11 items-center justify-center rounded-full border border-line text-ink transition-colors duration-150 hover:bg-surface disabled:opacity-40 disabled:pointer-events-none'

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={arrow}
          disabled={offset <= 0}
          onClick={() => onChange(shift(dayKey, -1))}
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
          <span className="sr-only">Vorige dag</span>
        </button>

        <p aria-live="polite" className="min-w-[9rem] text-center font-display text-lg font-extrabold">
          {label}
        </p>

        <button
          type="button"
          className={arrow}
          disabled={offset >= DAYS_AHEAD - 1}
          onClick={() => onChange(shift(dayKey, 1))}
        >
          <ChevronRight aria-hidden="true" className="size-5" />
          <span className="sr-only">Volgende dag</span>
        </button>

        {/* Blijft staan als je op vandaag bent, zodat de pijlen niet verspringen. */}
        <button
          type="button"
          disabled={offset === 0}
          aria-hidden={offset === 0}
          onClick={() => onChange(brusselsDayKey(now))}
          className={[
            'min-h-11 rounded-full px-4 font-bold text-blue transition-colors duration-150 hover:bg-blue-tint hover:text-blue-dark',
            offset === 0 ? 'invisible' : '',
          ].join(' ')}
        >
          Naar vandaag
        </button>
      </div>

      <p data-numeric className="text-sm text-ink-soft">
        {count === 0 ? 'Geen afspraken op deze dag' : count === 1 ? '1 afspraak' : `${count} afspraken`}
      </p>
    </div>
  )
}
