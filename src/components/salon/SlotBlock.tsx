import { CalendarCheck, Check, CircleDashed, Hourglass } from 'lucide-react'

import type { Offer, Salon, Slot, Treatment, WaitlistEntry } from '../../domain/types'
import { useCountdown } from '../../hooks/useCountdown'
import { formatCountdown, formatDuration, formatEuro, formatTime, slotMinutes } from '../../lib/time'
import { Button } from '../ui/Button'
import { DrainBar } from '../ui/DrainBar'
import { SimulateButtons } from './SimulateButtons'

const SHELL = 'flex gap-4 rounded-block border p-4 transition-colors duration-300'

export function SlotBlock({
  slot,
  salon,
  treatment,
  filledTreatment,
  offer,
  offerEntry,
  filledEntry,
  now,
  busy,
  onRelease,
  onSimulate,
}: {
  slot: Slot
  salon: Salon
  treatment: Treatment | undefined
  filledTreatment: Treatment | undefined
  offer: Offer | null
  offerEntry: WaitlistEntry | null
  filledEntry: WaitlistEntry | null
  now: Date
  busy: boolean
  onRelease: () => void
  onSimulate: (accept: boolean) => void
}) {
  const minutes = slotMinutes(slot.starts_at, slot.ends_at)
  const started = new Date(slot.starts_at).getTime() <= now.getTime()
  const countdown = useCountdown(
    slot.status === 'offered' && offer ? offer.expires_at : null,
    salon.offer_seconds,
  )

  const tone =
    slot.status === 'free'
      ? 'stripes-free border-free animate-soft-pulse'
      : slot.status === 'offered'
        ? 'border-offer bg-offer-tint'
        : slot.status === 'filled'
          ? 'border-blue bg-blue-tint'
          : 'border-line bg-bg'

  return (
    <article className={[SHELL, tone].join(' ')} style={{ minHeight: Math.max(56, minutes * 1.5) }}>
      <p className="w-14 shrink-0 font-display text-lg font-extrabold leading-tight" data-numeric>
        <time dateTime={slot.starts_at}>{formatTime(new Date(slot.starts_at))}</time>
      </p>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {slot.status === 'booked' ? (
          <>
            <h3 className="text-lg">{slot.customer_name ?? 'Afspraak'}</h3>
            <p className="flex items-center gap-2 text-ink-soft">
              <CalendarCheck aria-hidden="true" className="size-4 shrink-0" />
              Geboekt, {treatment?.name ?? 'behandeling'}, {minutes} min
            </p>
          </>
        ) : null}

        {slot.status === 'free' ? (
          <>
            <h3 className="text-lg text-free-text">Vrije plek</h3>
            <p className="flex items-center gap-2 text-free-text">
              <CircleDashed aria-hidden="true" className="size-4 shrink-0" />
              Niemand op de wachtlijst past. De plek staat open.
            </p>
          </>
        ) : null}

        {slot.status === 'offered' && offer ? (
          <>
            <h3 className="text-lg">Aangeboden aan {offerEntry?.first_name ?? 'de volgende'}</h3>
            <p className="flex items-center gap-2 text-ink-soft">
              <Hourglass aria-hidden="true" className="size-4 shrink-0" />
              Nog{' '}
              <output data-numeric className="font-bold text-ink">
                {formatCountdown(countdown.remainingMs)}
              </output>
              om te beslissen
            </p>
            <DrainBar fraction={countdown.fraction} />
            {offerEntry?.is_demo ? (
              <SimulateButtons
                name={offerEntry.first_name}
                busy={busy}
                onRespond={onSimulate}
              />
            ) : null}
          </>
        ) : null}

        {slot.status === 'filled' ? (
          <>
            <h3 className="flex items-center gap-2 text-lg text-blue-dark">
              <Check aria-hidden="true" className="size-5 shrink-0" />
              Ingevuld door {filledEntry?.first_name ?? 'een klant'}
            </h3>
            <p className="text-ink-soft">
              {slot.filled_at && slot.released_at
                ? `${formatDuration(
                    new Date(slot.filled_at).getTime() - new Date(slot.released_at).getTime(),
                  )} na de annulering`
                : 'Opnieuw ingevuld'}
              {filledTreatment && filledTreatment.id !== slot.treatment_id
                ? `, ${filledTreatment.name} in een slot van ${minutes} min`
                : ''}
            </p>
            {slot.final_price_cents !== null ? (
              <p data-numeric className="text-ink-soft">
                {formatEuro(slot.final_price_cents)}
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      {slot.status === 'booked' && !started ? (
        <div className="shrink-0 self-start">
          <Button variant="secondary" onClick={onRelease}>
            Plek vrijgeven
          </Button>
        </div>
      ) : null}
    </article>
  )
}
