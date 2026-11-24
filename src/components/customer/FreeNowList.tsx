import { CircleDashed } from 'lucide-react'

import type { Salon, Slot, Treatment } from '../../domain/types'
import { nextPriceDrop, priceFor } from '../../lib/pricing'
import { isBookable, isGap } from '../../lib/slots'
import {
  formatDayLabel,
  formatDuration,
  formatEuro,
  formatMinutes,
  formatTime,
  slotMinutes,
} from '../../lib/time'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'

/** S5: plekken die nu open staan en die je meteen kan boeken. */
export function FreeNowList({
  slots,
  treatments,
  salon,
  now,
  onClaim,
}: {
  slots: Slot[]
  treatments: Treatment[]
  salon: Salon
  now: Date
  onClaim: (slot: Slot) => void
}) {
  // Alleen plekken die vrijkwamen doordat iemand afzegde. Gewone vrije
  // uren staan in de boekingsagenda, zonder last-minute framing.
  const free = slots
    .filter((slot) => isGap(slot) && isBookable(slot, now))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))

  const treatmentById = new Map(treatments.map((treatment) => [treatment.id, treatment]))

  return (
    <section aria-labelledby="vrij-kop" className="flex flex-col gap-4">
      <h2 id="vrij-kop" className="text-xl">
        Vrij nu
      </h2>

      {free.length === 0 ? (
        <EmptyState>
          Er is nu geen last-minute plek vrij. Zet je op de wachtlijst, dan krijg je de
          eerstvolgende die past.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {free.map((slot) => {
            const treatment = treatmentById.get(slot.treatment_id)
            const base = treatment?.price_cents ?? 0
            const startsAt = new Date(slot.starts_at)
            const price = priceFor(base, startsAt, now, salon.last_minute_discount)
            const drop = nextPriceDrop(base, startsAt, now, salon.last_minute_discount)

            return (
              <li
                key={slot.id}
                className="stripes-free flex flex-col gap-3 rounded-block border border-free p-4"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p data-numeric className="font-display text-xl font-extrabold">
                    <time dateTime={slot.starts_at}>{formatTime(startsAt)}</time>
                  </p>
                  <p className="text-ink-soft">{formatDayLabel(startsAt, now)}</p>
                </div>

                <p className="flex items-center gap-2 text-free-text">
                  <CircleDashed aria-hidden="true" className="size-4 shrink-0" />
                  {treatment?.name ?? 'Behandeling'}, {slotMinutes(slot.starts_at, slot.ends_at)} min
                </p>

                <p className="flex items-baseline gap-2">
                  <span data-numeric className="text-lg font-bold">
                    {formatEuro(price.cents)}
                  </span>
                  {price.pct > 0 ? (
                    <>
                      <s data-numeric className="text-ink-soft">
                        {formatEuro(base)}
                      </s>
                      <span className="text-sm text-free-text">last minute</span>
                    </>
                  ) : null}
                </p>

                {drop ? (
                  <p className="text-sm text-ink-soft">
                    Prijs zakt over <span data-numeric>
                      {drop.inMs > 120_000 ? formatMinutes(drop.inMs / 60_000) : formatDuration(drop.inMs)}
                    </span> naar{' '}
                    <span data-numeric>{formatEuro(drop.cents)}</span>.
                  </p>
                ) : null}

                <div>
                  <Button variant="primary" onClick={() => onClaim(slot)}>
                    Boek deze plek
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
