import { useEffect, useRef, useState } from 'react'

import { APP_NAME } from '../../config'
import type { Offer, Salon, Slot, Treatment } from '../../domain/types'
import { useCountdown } from '../../hooks/useCountdown'
import { formatCountdown, formatDayLabel, formatEuro, formatTime } from '../../lib/time'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { DrainBar } from '../ui/DrainBar'

/**
 * Het aanbod valt binnen op de gsm: één enorm tijdstip, een tijdbalk die
 * leegloopt en twee knoppen. Esc weigert niet; het aanbod blijft lopen.
 */
export function OfferTakeover({
  offer,
  slot,
  treatment,
  salon,
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
  now: Date
  busy: boolean
  onAccept: () => void
  onDecline: () => void
  onClose: () => void
}) {
  const countdown = useCountdown(offer.expires_at, salon.offer_seconds)
  const timeRef = useRef<HTMLParagraphElement>(null)
  const [announced, setAnnounced] = useState('')

  const startsAt = slot ? new Date(slot.starts_at) : new Date(offer.created_at)
  const seconds = Math.ceil(countdown.remainingMs / 1000)

  useEffect(() => {
    const previousTitle = document.title
    document.title = `Plek vrij - ${APP_NAME}`
    navigator.vibrate?.([200, 100, 200])
    timeRef.current?.focus()
    return () => {
      document.title = previousTitle
    }
  }, [])

  useEffect(() => {
    if (seconds <= 10 && announced !== '10') setAnnounced('10')
    else if (seconds <= 30 && seconds > 10 && announced !== '30') setAnnounced('30')
  }, [seconds, announced])

  return (
    <Dialog
      open
      onClose={onClose}
      role="alertdialog"
      dismissable={false}
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
          <p className="flex items-baseline gap-2">
            <span data-numeric className="text-lg font-bold">
              {formatEuro(offer.price_cents)}
            </span>
            {offer.price_cents < offer.original_price_cents ? (
              <>
                <s data-numeric className="text-ink-soft">
                  {formatEuro(offer.original_price_cents)}
                </s>
                <span className="sr-only">last-minute korting</span>
              </>
            ) : null}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <DrainBar fraction={countdown.fraction} tall />
          <p className="text-ink-soft">
            Je hebt nog{' '}
            <output data-numeric className="font-bold text-ink">
              {formatCountdown(countdown.remainingMs)}
            </output>
          </p>
          <span className="sr-only" aria-live="assertive">
            {announced === '10'
              ? 'Nog tien seconden om te beslissen.'
              : announced === '30'
                ? 'Nog dertig seconden om te beslissen.'
                : ''}
          </span>
        </div>

        {countdown.expired ? (
          <p role="alert" className="font-bold">
            De tijd is om. De plek ging naar de volgende in de rij. Je blijft op de wachtlijst.
          </p>
        ) : null}

        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            size="lg"
            block
            loading={busy}
            disabled={countdown.expired || busy}
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
