import confetti from 'canvas-confetti'
import { CalendarPlus, Check } from 'lucide-react'
import { useEffect } from 'react'

import { APP_NAME } from '../../config'
import type { BookingResult, Salon } from '../../domain/types'
import { buildIcs, downloadIcs } from '../../lib/ics'
import { daysSaved } from '../../lib/stats'
import { formatDayLabel, formatEuro, formatTime } from '../../lib/time'
import { Button } from '../ui/Button'

const BRAND_COLORS = ['#2457E6', '#FF6B4A', '#FFC233']

/** S3: geregeld, met confetti, gewonnen dagen en een agendabestand. */
export function SuccessView({
  booking,
  salon,
  joinedAt,
  now,
  onBack,
}: {
  booking: BookingResult
  salon: Salon
  joinedAt: Date
  now: Date
  onBack: () => void
}) {
  const startsAt = new Date(booking.starts_at)
  const endsAt = new Date(startsAt.getTime() + booking.duration_min * 60_000)
  const saved = daysSaved(salon.typical_wait_days, joinedAt, startsAt)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    void confetti({
      particleCount: 90,
      spread: 70,
      startVelocity: 38,
      origin: { y: 0.3 },
      colors: BRAND_COLORS,
      disableForReducedMotion: true,
    })
  }, [])

  function addToCalendar() {
    const ics = buildIcs({
      uid: `${booking.slot_id}@replannr`,
      title: `${booking.treatment} bij ${salon.name}`,
      start: startsAt,
      end: endsAt,
      location: `${salon.name}, ${salon.city}`,
      description: `Je plek via ${APP_NAME}.`,
    })
    downloadIcs('replannr-afspraak.ics', ics)
  }

  return (
    <section aria-labelledby="gelukt-kop" className="flex flex-col gap-6">
      <h2 id="gelukt-kop" className="flex items-start gap-3 text-2xl">
        <Check aria-hidden="true" className="mt-1 size-7 shrink-0 text-blue" />
        <span>
          Geregeld. Tot {formatDayLabel(startsAt, now)} om{' '}
          <span data-numeric>{formatTime(startsAt)}</span>.
        </span>
      </h2>

      {saved > 0 ? (
        <p className="text-lg">
          Je bent <span data-numeric className="font-bold text-blue">{saved} dagen</span> sneller
          geholpen dan normaal.
        </p>
      ) : null}

      <div className="flex flex-col gap-2 rounded-block border border-blue bg-blue-tint p-5">
        <p className="font-bold">{booking.treatment}</p>
        <p className="text-ink-soft">
          {salon.name}, {salon.city}, {booking.duration_min} min
        </p>
        <p className="flex items-baseline gap-2">
          <span data-numeric className="text-lg font-bold">
            {formatEuro(booking.price_cents)}
          </span>
          {booking.price_cents < booking.original_price_cents ? (
            <s data-numeric className="text-ink-soft">
              {formatEuro(booking.original_price_cents)}
            </s>
          ) : null}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="primary" onClick={addToCalendar}>
          <CalendarPlus aria-hidden="true" className="size-4" />
          Zet in mijn agenda
        </Button>
        <Button variant="quiet" onClick={onBack}>
          Terug naar {salon.name}
        </Button>
      </div>
    </section>
  )
}
