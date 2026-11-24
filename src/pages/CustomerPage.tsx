import { CalendarCheck, Hourglass } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'

import { AppHeader } from '../components/layout/AppHeader'
import { PageShell } from '../components/layout/PageShell'
import { ClaimDialog } from '../components/customer/ClaimDialog'
import { FreeNowList } from '../components/customer/FreeNowList'
import { JoinForm, type JoinValues } from '../components/customer/JoinForm'
import { OfferTakeover } from '../components/customer/OfferTakeover'
import { SuccessView } from '../components/customer/SuccessView'
import { WaitingCard } from '../components/customer/WaitingCard'
import { Button } from '../components/ui/Button'
import { ConfigNotice } from '../components/ui/ConfigNotice'
import { ErrorState } from '../components/ui/ErrorState'
import { Skeleton } from '../components/ui/Skeleton'
import { DEMO_SLUG } from '../config'
import type { BookingResult, Slot } from '../domain/types'
import { useExpiryEngine } from '../hooks/useExpiryEngine'
import { useMyEntries } from '../hooks/useMyEntries'
import { useNow } from '../hooks/useNow'
import { useRealtime } from '../hooks/useRealtime'
import { useSalon } from '../hooks/useSalon'
import { useSlots } from '../hooks/useSlots'
import { useWaitlist } from '../hooks/useWaitlist'
import { codeOfError, messageForError } from '../lib/errors'
import { brusselsDayKey, brusselsDayStart, formatDayLabel, formatEuro, formatTime } from '../lib/time'
import { acceptOffer, declineOffer } from '../services/offerService'
import { claimFreeSlot } from '../services/slotService'
import { isSupabaseConfigured } from '../services/supabase'
import { joinWaitlist, leaveWaitlist } from '../services/waitlistService'
import { addMyEntry, newToken, removeMyEntry } from '../storage/local'

export function CustomerPage() {
  const { slug = DEMO_SLUG } = useParams()
  const now = useNow()

  const { salon, treatments, status: salonStatus, error: salonError, refetch: refetchSalon } =
    useSalon(slug)
  const salonId = salon?.id ?? null

  const windowStart = useMemo(() => brusselsDayStart(new Date(), 0), [brusselsDayKey(now)])
  const windowEnd = useMemo(() => brusselsDayStart(new Date(), 14), [brusselsDayKey(now)])
  const slots = useSlots(salonId, windowStart, windowEnd)
  const waitlist = useWaitlist(salonId)
  const my = useMyEntries(slug)

  const refetchSlots = slots.refetch
  const refetchWaitlist = waitlist.refetch
  const refetchMine = my.refetch

  const refetchAll = useCallback(() => {
    void refetchSlots()
    void refetchWaitlist()
    void refetchMine()
  }, [refetchSlots, refetchWaitlist, refetchMine])

  const mode = useRealtime({
    key: `klant-${slug}`,
    salonId,
    tables: ['slots', 'offers', 'waitlist_entries'],
    onChange: refetchAll,
  })

  useExpiryEngine(my.offers)

  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [booking, setBooking] = useState<BookingResult | null>(null)
  const [claiming, setClaiming] = useState<Slot | null>(null)
  const [offerHidden, setOfferHidden] = useState(false)

  const activeEntry =
    my.entries.find((entry) => entry.status === 'offered') ??
    my.entries.find((entry) => entry.status === 'waiting') ??
    null

  const bookedEntry = my.entries.find((entry) => entry.status === 'booked') ?? null

  const activeOffer =
    my.offers.find((offer) => {
      if (offer.status !== 'pending') return false
      if (!my.entries.some((entry) => entry.id === offer.entry_id)) return false
      const slot = slots.slots.find((item) => item.id === offer.slot_id)
      // De plek moet nog openstaan en nog niet begonnen zijn.
      return Boolean(
        slot && slot.status === 'offered' && new Date(slot.starts_at).getTime() > now.getTime(),
      )
    }) ?? null

  const offerSlot = activeOffer
    ? slots.slots.find((slot) => slot.id === activeOffer.slot_id) ?? null
    : null

  const offerEntry = activeOffer
    ? my.entries.find((entry) => entry.id === activeOffer.entry_id) ?? null
    : null

  async function onJoin(values: JoinValues) {
    const token = newToken()
    setBusy(true)
    setServerError(null)
    try {
      const entryId = await joinWaitlist({
        salonSlug: slug,
        treatmentId: values.treatmentId,
        firstName: values.firstName,
        days: values.days,
        timeFrom: values.timeFrom,
        timeTo: values.timeTo,
        leadMinutes: values.leadMinutes,
        token,
      })
      addMyEntry({ entryId, token, salonSlug: slug, firstName: values.firstName })
      my.refreshLocal()
      refetchAll()
      toast.success('Je staat op de wachtlijst')
    } catch (caught) {
      setServerError(messageForError(caught))
    } finally {
      setBusy(false)
    }
  }

  async function onLeave() {
    if (!activeEntry) return
    const token = my.tokenFor(activeEntry.id)
    if (!token) return
    setBusy(true)
    try {
      await leaveWaitlist(activeEntry.id, token)
      removeMyEntry(activeEntry.id)
      my.refreshLocal()
      refetchAll()
      toast.success('Je staat niet meer op de wachtlijst')
    } catch (caught) {
      toast.error(messageForError(caught))
    } finally {
      setBusy(false)
    }
  }

  async function onAccept() {
    if (!activeOffer) return
    const token = my.tokenFor(activeOffer.entry_id)
    if (!token) return
    setBusy(true)
    try {
      const result = await acceptOffer(activeOffer.id, token)
      setBooking(result)
      setOfferHidden(false)
      refetchAll()
    } catch (caught) {
      const code = codeOfError(caught)
      if (code === 'SLOT_TAKEN' || code === 'OFFER_CLOSED' || code === 'OFFER_EXPIRED') {
        toast('Iemand was je net voor. Je blijft op de wachtlijst.')
      } else {
        toast.error(messageForError(caught))
      }
      refetchAll()
    } finally {
      setBusy(false)
    }
  }

  async function onDecline() {
    if (!activeOffer) return
    const token = my.tokenFor(activeOffer.entry_id)
    if (!token) return
    setBusy(true)
    try {
      await declineOffer(activeOffer.id, token)
      toast.success('Je laat deze plek voorbijgaan. Je blijft op de wachtlijst.')
      refetchAll()
    } catch (caught) {
      toast.error(messageForError(caught))
      refetchAll()
    } finally {
      setBusy(false)
    }
  }

  async function onClaimConfirm(firstName: string) {
    if (!claiming) return
    const token = newToken()
    setBusy(true)
    setServerError(null)
    try {
      const result = await claimFreeSlot(claiming.id, firstName, token)
      if (result.entry_id) {
        addMyEntry({ entryId: result.entry_id, token, salonSlug: slug, firstName })
        my.refreshLocal()
      }
      setClaiming(null)
      setBooking(result)
      refetchAll()
    } catch (caught) {
      setServerError(messageForError(caught))
    } finally {
      setBusy(false)
    }
  }

  const notFound = salonStatus === 'ready' && salon === null && isSupabaseConfigured
  const bookedSlot = bookedEntry
    ? slots.slots.find((slot) => slot.filled_by_entry_id === bookedEntry.id) ?? null
    : null

  return (
    <>
      <AppHeader slug={slug} salonName={salon?.name} mode={mode} />

      <PageShell width="narrow">
        {!isSupabaseConfigured ? (
          <div className="mb-10">
            <ConfigNotice />
          </div>
        ) : null}

        {notFound ? (
          <div className="flex flex-col items-start gap-4">
            <h1 className="text-2xl">Deze salon bestaat niet</h1>
            <p className="text-ink-soft">Controleer de link of de QR-code.</p>
            <Link to="/" className="font-bold text-blue underline">
              Naar de startpagina
            </Link>
          </div>
        ) : null}

        {salonStatus === 'error' ? (
          <ErrorState error={salonError} onRetry={() => void refetchSalon()} />
        ) : null}

        {salonStatus === 'loading' ? (
          <div className="flex flex-col gap-4">
            <span className="sr-only">De pagina wordt geladen.</span>
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-24" />
            <Skeleton className="h-64" />
          </div>
        ) : null}

        {salon ? (
          <div className="flex flex-col gap-12">
            <header className="flex flex-col gap-3">
              <h1 className="text-3xl">{salon.name}</h1>
              <p className="text-ink-soft">
                {salon.city}. Gemiddeld wacht je hier{' '}
                <span data-numeric>{salon.typical_wait_days} dagen</span> op een afspraak. Met
                Invaller is dat vaak maar een paar uur.
              </p>
            </header>

            {booking ? (
              <SuccessView
                booking={booking}
                salon={salon}
                joinedAt={
                  activeEntry || bookedEntry
                    ? new Date((bookedEntry ?? activeEntry)!.created_at)
                    : now
                }
                now={now}
                onBack={() => setBooking(null)}
              />
            ) : null}

            {!booking && bookedEntry && bookedSlot ? (
              <section aria-labelledby="afspraak-kop" className="flex flex-col gap-4">
                <h2 id="afspraak-kop" className="text-2xl">
                  Je afspraak staat vast
                </h2>
                <div className="flex flex-col gap-2 rounded-block border border-blue bg-blue-tint p-5">
                  <p className="flex items-center gap-2 font-bold">
                    <CalendarCheck aria-hidden="true" className="size-5 shrink-0" />
                    <span>
                      {formatDayLabel(new Date(bookedSlot.starts_at), now)} om{' '}
                      <span data-numeric>{formatTime(new Date(bookedSlot.starts_at))}</span>
                    </span>
                  </p>
                  <p className="text-ink-soft">
                    {treatments.find((t) => t.id === bookedSlot.filled_treatment_id)?.name ??
                      'Behandeling'}
                    {bookedSlot.final_price_cents !== null ? (
                      <span data-numeric>, {formatEuro(bookedSlot.final_price_cents)}</span>
                    ) : null}
                  </p>
                </div>
                <div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      removeMyEntry(bookedEntry.id)
                      my.refreshLocal()
                      refetchAll()
                    }}
                  >
                    Opnieuw inschrijven
                  </Button>
                </div>
              </section>
            ) : null}

            {!booking && !bookedEntry && activeEntry ? (
              <WaitingCard
                entry={activeEntry}
                allEntries={waitlist.entries}
                treatment={treatments.find((t) => t.id === activeEntry.treatment_id)}
                busy={busy}
                onLeave={onLeave}
              />
            ) : null}

            {!booking && !bookedEntry && !activeEntry ? (
              <section aria-labelledby="inschrijven-kop" className="flex flex-col gap-5">
                <h2 id="inschrijven-kop" className="text-2xl">
                  Zet je op de wachtlijst
                </h2>
                <p className="text-ink-soft">
                  Komt er een plek vrij die bij je past, dan krijg je ze hier meteen aangeboden.
                </p>
                <JoinForm
                  treatments={treatments}
                  busy={busy}
                  serverError={serverError}
                  onSubmit={onJoin}
                />
              </section>
            ) : null}

            {!booking ? (
              <FreeNowList
                slots={slots.slots}
                treatments={treatments}
                salon={salon}
                now={now}
                onClaim={setClaiming}
              />
            ) : null}
          </div>
        ) : null}
      </PageShell>

      {activeOffer && salon && offerHidden ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-offer bg-offer-tint px-5 py-4">
          <div className="mx-auto flex max-w-[35rem] flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-bold">
              <Hourglass aria-hidden="true" className="size-5 shrink-0" />
              Je hebt een openstaand aanbod
            </p>
            <Button variant="primary" onClick={() => setOfferHidden(false)}>
              Bekijk het aanbod
            </Button>
          </div>
        </div>
      ) : null}

      {activeOffer && salon && !offerHidden ? (
        <OfferTakeover
          offer={activeOffer}
          slot={offerSlot}
          treatment={treatments.find((t) => t.id === activeOffer.treatment_id)}
          salon={salon}
          isVip={offerEntry?.is_vip ?? false}
          now={now}
          busy={busy}
          onAccept={onAccept}
          onDecline={onDecline}
          onClose={() => setOfferHidden(true)}
        />
      ) : null}

      <ClaimDialog
        slot={claiming}
        treatment={treatments.find((t) => t.id === claiming?.treatment_id)}
        now={now}
        busy={busy}
        serverError={serverError}
        onConfirm={onClaimConfirm}
        onCancel={() => {
          setClaiming(null)
          setServerError(null)
        }}
      />
    </>
  )
}
