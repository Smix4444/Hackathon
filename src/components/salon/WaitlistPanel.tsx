import { Star } from 'lucide-react'

import type { Treatment, WaitlistEntry } from '../../domain/types'
import { dayShort, trimSeconds } from '../../lib/time'
import { EmptyState } from '../ui/EmptyState'

/** Wachtenden met hun venster. De ster geeft VIP-voorrang (S6). */
export function WaitlistPanel({
  entries,
  treatments,
  onToggleVip,
}: {
  entries: WaitlistEntry[]
  treatments: Treatment[]
  onToggleVip: (entry: WaitlistEntry) => void
}) {
  const waiting = entries.filter((e) => e.status === 'waiting' || e.status === 'offered')
  const treatmentById = new Map(treatments.map((t) => [t.id, t]))

  return (
    <section aria-labelledby="wachtlijst-kop" className="flex flex-col gap-3">
      <h2 id="wachtlijst-kop" className="text-lg">
        Wachtlijst <span data-numeric className="text-ink-soft">({waiting.length})</span>
      </h2>

      {waiting.length === 0 ? (
        <EmptyState>Nog niemand op de wachtlijst. Laat klanten de QR-code scannen.</EmptyState>
      ) : (
        <ul className="flex flex-col divide-y divide-line border-y border-line">
          {waiting.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 py-3">
              <button
                type="button"
                aria-pressed={entry.is_vip}
                onClick={() => onToggleVip(entry)}
                className={[
                  'flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors duration-150',
                  entry.is_vip
                    ? 'border-offer bg-offer-tint text-offer-text'
                    : 'border-line text-ink-soft hover:bg-surface',
                ].join(' ')}
              >
                <Star aria-hidden="true" className="size-5" fill={entry.is_vip ? 'currentColor' : 'none'} />
                <span className="sr-only">
                  {entry.is_vip ? `${entry.first_name} is vaste klant` : `${entry.first_name} vaste klant maken`}
                </span>
              </button>

              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {entry.first_name}
                  {entry.is_vip ? <span className="text-ink-soft"> vaste klant</span> : null}
                </p>
                <p className="text-sm text-ink-soft">
                  {treatmentById.get(entry.treatment_id)?.name ?? 'Behandeling'}
                </p>
                <p data-numeric className="text-sm text-ink-soft">
                  {entry.days.map((d) => dayShort(d)).join(' ')} van {trimSeconds(entry.time_from)} tot{' '}
                  {trimSeconds(entry.time_to)}
                </p>
                {entry.status === 'offered' ? (
                  <p className="text-sm font-bold text-offer-text">Heeft nu een aanbod</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
