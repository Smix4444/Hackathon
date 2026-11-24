import { Star, Users } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { APP_NAME } from '../../config'
import type { Offer, Salon, Slot, Treatment } from '../../domain/types'
import { nextPriceDrop, priceFor } from '../../lib/pricing'
import {
  formatDayLabel,
  formatDuration,
  formatEuro,
  formatMinutes,
  formatTime,
} from '../../lib/time'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

/**
 * Het aanbod valt binnen op de gsm: één enorm tijdstip en twee knoppen.
 * Er is geen persoonlijke klok meer; de plek staat open voor iedereen die
 * past en wie eerst accepteert, krijgt ze. Wachten maakt het goedkoper,
 * maar ook risicovoller.
 */
export function OfferTakeover({
  offer,
  slot,
  treatment,
  salon,
  isVip,
  now,
  busy,
  onAccept,
  onDecline,
  onClose,
}: {
  offer: Offer
  slot: Slot | null
  treatment: Treatment | undefined
  salon: Salon
  isVip: boolean
  now: Date
  busy: boolean
  onAccept: () => void
  onDecline: () => void
  onClose: () => void
}) {
  const timeRef = useRef<HTMLParagraphElement>(null)
  const startsAt = slot ? new Date(slot.starts_at) : new Date(offer.created_at)

  const base = offer.original_price_cents
  const price = priceFor(
    base,
    startsAt,
    now,
    salon.last_minute_discount,
    isVip,
    salon.vip_discount_pct,
  )
  const drop = nextPriceDrop(
    base,
    startsAt,
    now,
    salon.last_minute_discount,
    isVip,
    salon.vip_discount_pct,
  )

  useEffect(() => {
    const previousTitle = document.title
    document.title = `Plek vrij - ${APP_NAME}`
    navigator.vibrate?.([200, 100, 200])
    timeRef.current?.focus()
    return () => {
      document.title = previousTitle
    }
  }, [])

  return (
    <Dialog
      open
      onClose={onClose}
      role="alertdialog"
      labelledBy="aanbod-kop"
      describedBy="aanbod-details"
    >
      <div className="flex flex-col gap-5">
        <h2 id="aanbod-kop" className="text-lg font-bold">
          Plek vrij bij {salon.name}
        </h2>

        <p
          ref={timeRef}
          tabIndex={-1}
          data-numeric
          className="font-display font-extrabold leading-[0.9] text-ink"
          style={{ fontSize: 'clamp(4.5rem, 22vw, 9rem)' }}
        >
          <time dateTime={startsAt.toISOString()}>{formatTime(startsAt)}</time>
        </p>

        <div id="aanbod-details" className="flex flex-col gap-1">
          <p className="text-xl">{formatDayLabel(startsAt, now)}</p>
          <p className="text-ink-soft">
            {treatment?.name ?? 'Behandeling'}, {treatment?.duration_min ?? '?'} min
          </p>
          <p className="flex flex-wrap items-baseline gap-2">
            <span data-numeric className="text-lg font-bold">
              {formatEuro(price.cents)}
            </span>
            {price.cents < base ? (
              <s data-numeric className="text-ink-soft">
                {formatEuro(base)}
              </s>
            ) : null}
          </p>
          {price.vipPct > 0 ? (
            <p className="flex items-center gap-2 text-sm text-offer-text">
              <Star aria-hidden="true" className="size-4 shrink-0" fill="currentColor" />
              <span>
                <span data-numeric>{price.vipPct}%</span> korting omdat je vaste klant bent
              </span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 rounded-block border border-offer bg-offer-tint p-4">
          <p className="flex items-center gap-2 font-bold">
            <Users aria-hidden="true" className="size-5 shrink-0" />
            <span>Wie eerst accepteert, krijgt de plek</span>
          </p>
          {drop ? (
            <p className="text-ink-soft">
              Over{' '}
              <span data-numeric>
                {drop.inMs > 120_000 ? formatMinutes(drop.inMs / 60_000) : formatDuration(drop.inMs)}
              </span>{' '}
              zakt de prijs naar <span data-numeric>{formatEuro(drop.cents)}</span>. Wachten is
              goedkoper, maar iemand anders kan de plek intussen nemen.
            </p>
          ) : (
            <p className="text-ink-soft">
              Dit is de laagste prijs. Wacht je langer, dan is de plek misschien weg.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            size="lg"
            block
            loading={busy}
            disabled={busy}
            onClick={onAccept}
          >
            Ik neem deze plek
          </Button>
          <Button variant="secondary" size="lg" block disabled={busy} onClick={onDecline}>
            Niet voor mij
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
