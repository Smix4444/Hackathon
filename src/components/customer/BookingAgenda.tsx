import { CalendarCheck } from 'lucide-react'
import { useState } from 'react'

import type { Salon, Slot, Treatment } from '../../domain/types'
import { priceFor } from '../../lib/pricing'
import { isBookable, isOpenHour } from '../../lib/slots'
import {
  brusselsDayKey,
  dayOfMonth,
  dayShort,
  formatDayLabel,
  formatEuro,
  formatTime,
  isoDow,
  shiftDay,
  slotMinutes,
} from '../../lib/time'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'

const DAYS_SHOWN = 21

/**
 * Gewone afspraak boeken: eerst een dag kiezen, dan een vrij uur.
 * Toont alleen uren die nog nooit geboekt waren; vrijgekomen plekken
 * staan apart onder "Vrij nu", met hun last-minute prijs.
 */
export function BookingAgenda({
  slots,
  treatments,
  salon,
  now,
  onBook,
}: {
  slots: Slot[]
  treatments: Treatment[]
  salon: Salon
  now: Date
  onBook: (slot: Slot) => void
}) {
  const todayKey = brusselsDayKey(now)
  const [selected, setSelected] = useState(todayKey)

  const open = slots.filter((slot) => isOpenHour(slot) && isBookable(slot, now))

  const countByDay = new Map<string, number>()
  for (const slot of open) {
    const key = brusselsDayKey(new Date(slot.starts_at))
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1)
  }

  const days = Array.from({ length: DAYS_SHOWN }, (_, i) => shiftDay(todayKey, i))
  const daySlots = open
    .filter((slot) => brusselsDayKey(new Date(slot.starts_at)) === selected)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))

  const treatmentById = new Map(treatments.map((treatment) => [treatment.id, treatment]))

  return (
    <section aria-labelledby="boeken-kop" className="flex flex-col gap-4">
      <h2 id="boeken-kop" className="text-xl">
        Een afspraak boeken
      </h2>
      <p className="text-ink-soft">
        Kies een dag en een uur dat je past. Je hoeft geen account te maken.
      </p>

      <div
        role="group"
        aria-label="Kies een dag"
        className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0"
      >
        {days.map((dayKey) => {
          const count = countByDay.get(dayKey) ?? 0
          const isSelected = dayKey === selected
          return (
            <button
              key={dayKey}
              type="button"
              aria-pressed={isSelected}
              disabled={count === 0}
              onClick={() => setSelected(dayKey)}
              className={[
                'flex min-h-11 w-16 shrink-0 flex-col items-center justify-center rounded-block border py-2 transition-colors duration-150',
                isSelected
                  ? 'border-blue bg-blue text-white'
                  : count === 0
                    ? 'border-line bg-bg text-ink-soft/40'
                    : 'border-line bg-bg text-ink hover:bg-surface',
              ].join(' ')}
            >
              <span aria-hidden="true" className="text-xs">
                {dayShort(isoDow(new Date(`${dayKey}T12:00:00Z`)))}
              </span>
              <span aria-hidden="true" data-numeric className="font-display font-extrabold">
                {dayOfMonth(dayKey)}
              </span>
              <span className="sr-only">
                {formatDayLabel(new Date(`${dayKey}T12:00:00Z`), now)},{' '}
                {count === 0 ? 'geen vrije uren' : `${count} vrije uren`}
              </span>
            </button>
          )
        })}
      </div>

      {daySlots.length === 0 ? (
        <EmptyState>
          Op deze dag is er niets meer vrij. Kies een andere dag, of zet je op de wachtlijst voor
          een plek die vrijkomt.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {daySlots.map((slot) => {
            const treatment = treatmentById.get(slot.treatment_id)
            const price = priceFor(
              treatment?.price_cents ?? 0,
              new Date(slot.starts_at),
              now,
              salon.last_minute_discount,
            )
            return (
              <li
                key={slot.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-block border border-line p-4"
              >
                <div className="flex min-w-0 flex-col">
                  <p data-numeric className="font-display text-lg font-extrabold">
                    <time dateTime={slot.starts_at}>{formatTime(new Date(slot.starts_at))}</time>
                  </p>
                  <p className="flex items-center gap-2 text-ink-soft">
                    <CalendarCheck aria-hidden="true" className="size-4 shrink-0" />
                    <span>
                      {treatment?.name ?? 'Behandeling'},{' '}
                      {slotMinutes(slot.starts_at, slot.ends_at)} min,{' '}
                      <span data-numeric>{formatEuro(price.cents)}</span>
                    </span>
                  </p>
                </div>
                <Button variant="primary" onClick={() => onBook(slot)}>
                  Boek dit uur
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
