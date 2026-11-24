import { CalendarCheck, Check, CircleDashed, Hourglass } from 'lucide-react'

import type { Offer, Salon, Slot, Treatment, WaitlistEntry } from '../../domain/types'
import { nextPriceDrop, priceFor } from '../../lib/pricing'
import { isGap } from '../../lib/slots'
import {
  formatDuration,
  formatEuro,
  formatMinutes,
  formatTime,
  slotMinutes,
} from '../../lib/time'
import { Button } from '../ui/Button'
import { SimulateButtons } from './SimulateButtons'

const SHELL = 'flex gap-4 rounded-block border p-4 transition-colors duration-300'

export function SlotBlock({
  slot,
  salon,
  treatment,
  filledTreatment,
  pendingOffers,
  entryById,
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
  /** Openstaande uitnodigingen voor dit slot. */
  pendingOffers: Offer[]
  entryById: Map<string, WaitlistEntry>
  filledEntry: WaitlistEntry | null
  now: Date
  busy: boolean
  onRelease: () => void
  onSimulate: (offerId: string, accept: boolean) => void
}) {
  const minutes = slotMinutes(slot.starts_at, slot.ends_at)
  const startsAt = new Date(slot.starts_at)
  const started = startsAt.getTime() <= now.getTime()

  const base = treatment?.price_cents ?? 0
  const price = priceFor(base, startsAt, now, salon.last_minute_discount)
  const drop = nextPriceDrop(base, startsAt, now, salon.last_minute_discount)

  const demoOffers = pendingOffers
    .filter((offer) => entryById.get(offer.entry_id)?.is_demo)
    .slice(0, 2)

  const gap = isGap(slot)

  const tone =
    slot.status === 'free'
      ? gap
        ? 'stripes-free border-free animate-soft-pulse'
        : 'border-dashed border-line bg-bg'
      : slot.status === 'offered'
        ? 'border-offer bg-offer-tint'
        : slot.status === 'filled'
          ? 'border-blue bg-blue-tint'
          : 'border-line bg-bg'

  return (
    <article className={[SHELL, tone].join(' ')} style={{ minHeight: Math.max(56, minutes * 1.5) }}>
      <p className="w-14 shrink-0 font-display text-lg font-extrabold leading-tight" data-numeric>
        <time dateTime={slot.starts_at}>{formatTime(startsAt)}</time>
      </p>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {slot.status === 'booked' ? (
          <>
            <h3 className="text-lg">{slot.customer_name ?? 'Afspraak'}</h3>
            <p className="flex items-center gap-2 text-ink-soft">
              <CalendarCheck aria-hidden="true" className="size-4 shrink-0" />
              <span>
                Geboekt, {treatment?.name ?? 'behandeling'}, {minutes} min
              </span>
            </p>
          </>
        ) : null}

        {slot.status === 'free' ? (
          <>
            <h3 className={['text-lg', gap ? 'text-free-text' : 'text-ink-soft'].join(' ')}>
              {gap ? 'Vrije plek' : 'Vrij uur'}
            </h3>
            <p
              className={[
                'flex items-center gap-2',
                gap ? 'text-free-text' : 'text-ink-soft',
              ].join(' ')}
            >
              <CircleDashed aria-hidden="true" className="size-4 shrink-0" />
              <span>
                {gap
                  ? 'Niemand op de wachtlijst past. De plek staat open voor iedereen.'
                  : `Nog niet geboekt, ${treatment?.name ?? 'behandeling'}`}
              </span>
            </p>
          </>
        ) : null}

        {slot.status === 'offered' ? (
          <>
            <h3 className="text-lg">
              Open voor{' '}
              <span data-numeric>
                {pendingOffers.length} {pendingOffers.length === 1 ? 'wachtende' : 'wachtenden'}
              </span>
            </h3>
            <p className="flex items-center gap-2 text-ink-soft">
              <Hourglass aria-hidden="true" className="size-4 shrink-0" />
              <span>Wie eerst accepteert, krijgt de plek.</span>
            </p>
            <p className="text-ink-soft">
              <span data-numeric className="font-bold text-ink">
                {formatEuro(price.cents)}
              </span>
              {drop ? (
                <>
                  {', zakt over '}
                  <span data-numeric>
                    {drop.inMs > 120_000 ? formatMinutes(drop.inMs / 60_000) : formatDuration(drop.inMs)}
                  </span>
                  {' naar '}
                  <span data-numeric>{formatEuro(drop.cents)}</span>
                </>
              ) : null}
            </p>
            {demoOffers.length > 0 ? (
              <div className="flex flex-col gap-2">
                {demoOffers.map((offer) => (
                  <SimulateButtons
                    key={offer.id}
                    name={entryById.get(offer.entry_id)?.first_name ?? 'Demo'}
                    busy={busy}
                    onRespond={(accept) => onSimulate(offer.id, accept)}
                  />
                ))}
              </div>
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
                {filledEntry?.is_vip ? (
                  <span className="text-offer-text"> met korting voor vaste klanten</span>
                ) : null}
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
