import { ChevronLeft, ChevronRight } from 'lucide-react'

import type { Slot } from '../../domain/types'
import { isGap } from '../../lib/slots'
import {
  brusselsDayKey,
  dayOfMonth,
  dayShort,
  isSameMonth,
  monthGridDays,
  monthLabel,
  monthStartKey,
  shiftMonth,
} from '../../lib/time'

interface DayInfo {
  booked: number
  /** Vrijgekomen plekken: iemand zegde af. */
  gaps: number
  /** Gewone vrije uren die nog nooit geboekt waren. */
  open: number
  filled: number
}

function summarise(slots: Slot[]): Map<string, DayInfo> {
  const byDay = new Map<string, DayInfo>()
  for (const slot of slots) {
    const key = brusselsDayKey(new Date(slot.starts_at))
    const info = byDay.get(key) ?? { booked: 0, gaps: 0, open: 0, filled: 0 }
    if (slot.status === 'booked') info.booked += 1
    else if (slot.status === 'filled') info.filled += 1
    else if (isGap(slot)) info.gaps += 1
    else info.open += 1
    byDay.set(key, info)
  }
  return byDay
}

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7]

/**
 * De hele maand in één blik. Klik een dag om de afspraken van die dag te zien.
 * Een dag met een vrije plek krijgt een koraal stipje, zodat de salon meteen
 * ziet waar er nog een gat staat.
 */
export function MonthCalendar({
  monthKey,
  selectedDay,
  slots,
  now,
  onSelectDay,
  onChangeMonth,
}: {
  monthKey: string
  selectedDay: string
  slots: Slot[]
  now: Date
  onSelectDay: (dayKey: string) => void
  onChangeMonth: (monthKey: string) => void
}) {
  const todayKey = brusselsDayKey(now)
  const days = monthGridDays(monthKey)
  const byDay = summarise(slots)

  const arrow =
    'flex size-11 items-center justify-center rounded-full border border-line text-ink transition-colors duration-150 hover:bg-surface'

  return (
    <section aria-labelledby="maand-kop" className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={arrow}
          onClick={() => onChangeMonth(shiftMonth(monthKey, -1))}
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
          <span className="sr-only">Vorige maand</span>
        </button>

        <h2 id="maand-kop" className="min-w-[11rem] text-center text-lg">
          {monthLabel(monthKey)}
        </h2>

        <button
          type="button"
          className={arrow}
          onClick={() => onChangeMonth(shiftMonth(monthKey, 1))}
        >
          <ChevronRight aria-hidden="true" className="size-5" />
          <span className="sr-only">Volgende maand</span>
        </button>

        <button
          type="button"
          disabled={isSameMonth(todayKey, monthKey) && selectedDay === todayKey}
          onClick={() => {
            onChangeMonth(monthStartKey(todayKey))
            onSelectDay(todayKey)
          }}
          className="min-h-11 rounded-full px-4 font-bold text-blue transition-colors duration-150 hover:bg-blue-tint hover:text-blue-dark disabled:invisible"
        >
          Naar vandaag
        </button>
      </div>

      <div>
        <div className="grid grid-cols-7 gap-1 pb-2">
          {WEEKDAYS.map((dow) => (
            <p key={dow} className="text-center text-sm font-bold text-ink-soft">
              {dayShort(dow)}
            </p>
          ))}
        </div>

        <div role="grid" aria-label={`Agenda van ${monthLabel(monthKey)}`} className="grid grid-cols-7 gap-1">
          {days.map((dayKey) => {
            const info = byDay.get(dayKey)
            const inMonth = isSameMonth(dayKey, monthKey)
            const isToday = dayKey === todayKey
            const isSelected = dayKey === selectedDay
            const total =
              (info?.booked ?? 0) + (info?.gaps ?? 0) + (info?.open ?? 0) + (info?.filled ?? 0)

            const label = [
              `${dayOfMonth(dayKey)} ${monthLabel(dayKey)}`,
              total === 0 ? 'geen afspraken' : `${total} afspraken`,
              info?.gaps ? `${info.gaps} vrijgekomen plek` : null,
              info?.open ? `${info.open} vrij uur` : null,
            ]
              .filter(Boolean)
              .join(', ')

            return (
              <button
                key={dayKey}
                type="button"
                role="gridcell"
                aria-selected={isSelected}
                aria-current={isToday ? 'date' : undefined}
                onClick={() => onSelectDay(dayKey)}
                className={[
                  'flex min-h-[4.5rem] flex-col items-start gap-1 rounded-block border p-2 text-left transition-colors duration-150',
                  isSelected
                    ? 'border-blue bg-blue-tint'
                    : inMonth
                      ? 'border-line bg-bg hover:bg-surface'
                      : 'border-transparent bg-bg text-ink-soft/50 hover:bg-surface',
                  isToday && !isSelected ? 'border-ink' : '',
                ].join(' ')}
              >
                <span className="sr-only">{label}</span>

                <span
                  aria-hidden="true"
                  data-numeric
                  className={['font-display font-extrabold', isToday ? 'text-blue' : ''].join(' ')}
                >
                  {dayOfMonth(dayKey)}
                </span>

                {total > 0 ? (
                  <span aria-hidden="true" className="flex flex-wrap items-center gap-1">
                    {info?.gaps ? <span className="size-2 rounded-full bg-free" /> : null}
                    {info?.filled ? <span className="size-2 rounded-full bg-blue" /> : null}
                    {info?.booked ? <span className="size-2 rounded-full bg-ink-soft" /> : null}
                    {info?.open ? (
                      <span className="size-2 rounded-full border border-ink-soft" />
                    ) : null}
                    <span data-numeric className="text-xs text-ink-soft">
                      {total}
                    </span>
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      <p className="flex flex-wrap items-center gap-4 text-sm text-ink-soft">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rounded-full bg-ink-soft" />
          geboekt
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rounded-full bg-free" />
          vrijgekomen plek
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rounded-full border border-ink-soft" />
          vrij uur
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rounded-full bg-blue" />
          opnieuw ingevuld
        </span>
      </p>
    </section>
  )
}
