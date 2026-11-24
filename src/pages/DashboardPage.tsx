import { useCallback, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { AppHeader } from '../components/layout/AppHeader'
import { PageShell } from '../components/layout/PageShell'
import { ActivityFeed } from '../components/salon/ActivityFeed'
import { AgendaTimeline } from '../components/salon/AgendaTimeline'
import { MonthCalendar } from '../components/salon/MonthCalendar'
import { ImpactStrip } from '../components/salon/ImpactStrip'
import { QrCard } from '../components/salon/QrCard'
import { ReleaseDialog } from '../components/salon/ReleaseDialog'
import { SettingsDialog } from '../components/salon/SettingsDialog'
import { WaitlistPanel } from '../components/salon/WaitlistPanel'
import { ConfigNotice } from '../components/ui/ConfigNotice'
import { ErrorState } from '../components/ui/ErrorState'
import { SkeletonAgenda } from '../components/ui/Skeleton'
import { DEMO_SLUG } from '../config'
import type { Slot, WaitlistEntry } from '../domain/types'
import { useEvents } from '../hooks/useEvents'
import { useExpiryEngine } from '../hooks/useExpiryEngine'
import { useNow } from '../hooks/useNow'
import { useOffers } from '../hooks/useOffers'
import { useRealtime } from '../hooks/useRealtime'
import { useSalon } from '../hooks/useSalon'
import { useSlots } from '../hooks/useSlots'
import { useWaitlist } from '../hooks/useWaitlist'
import { messageForError } from '../lib/errors'
import { computeImpact } from '../lib/stats'
import {
  brusselsDayKey,
  brusselsMidnight,
  formatDayLabel,
  monthGridDays,
  monthStartKey,
  shiftDay,
} from '../lib/time'
import { simulateResponse } from '../services/offerService'
import { releaseSlot } from '../services/slotService'
import { isSupabaseConfigured } from '../services/supabase'
import { setVip } from '../services/waitlistService'

/** "vandaag" -> "Vandaag", voor aan het begin van een kop. */
function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function DashboardPage() {
  const { slug = DEMO_SLUG } = useParams()
  const now = useNow()
  const [params, setParams] = useSearchParams()

  const {
    salon,
    treatments,
    status: salonStatus,
    error: salonError,
    refetch: refetchSalon,
  } = useSalon(slug)
  const salonId = salon?.id ?? null

  // De zichtbare maand plus vandaag, zodat de impactstrook blijft kloppen
  // terwijl je door de maanden bladert.
  const todayAnchor = brusselsDayKey(now)
  const monthAnchor = params.get('dag') ?? todayAnchor
  const gridRange = useMemo(() => {
    const grid = monthGridDays(monthStartKey(monthAnchor))
    const first = brusselsMidnight(grid[0])
    const last = brusselsMidnight(shiftDay(grid[grid.length - 1], 1))
    const todayStart = brusselsMidnight(todayAnchor)
    const todayEnd = brusselsMidnight(shiftDay(todayAnchor, 2))
    return {
      from: first < todayStart ? first : todayStart,
      to: last > todayEnd ? last : todayEnd,
    }
  }, [monthAnchor, todayAnchor])
  const windowStart = gridRange.from
  const windowEnd = gridRange.to

  const slots = useSlots(salonId, windowStart, windowEnd)
  const waitlist = useWaitlist(salonId)
  const offers = useOffers(salonId)
  const events = useEvents(salonId)

  const refetchSlots = slots.refetch
  const refetchWaitlist = waitlist.refetch
  const refetchOffers = offers.refetch
  const refetchEvents = events.refetch

  const refetchAll = useCallback(() => {
    void refetchSlots()
    void refetchWaitlist()
    void refetchOffers()
    void refetchEvents()
  }, [refetchSlots, refetchWaitlist, refetchOffers, refetchEvents])

  const mode = useRealtime({
    key: `dashboard-${slug}`,
    salonId,
    tables: ['slots', 'offers', 'waitlist_entries', 'events'],
    onChange: refetchAll,
  })

  useExpiryEngine(offers.offers)

  const [releasing, setReleasing] = useState<Slot | null>(null)
  const [busySlotId, setBusySlotId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const todayKey = brusselsDayKey(now)
  const requested = params.get('dag')
  const dayKey =
    requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : todayKey

  const [monthKey, setMonthKey] = useState(() => monthStartKey(dayKey))

  const daySlots = slots.slots.filter((slot) => brusselsDayKey(new Date(slot.starts_at)) === dayKey)
  const impact = computeImpact(slots.slots, now)

  function selectDay(next: string) {
    const nextParams = new URLSearchParams(params)
    if (next === todayKey) nextParams.delete('dag')
    else nextParams.set('dag', next)
    setParams(nextParams, { replace: true })
    setMonthKey(monthStartKey(next))
  }

  async function confirmRelease() {
    if (!releasing) return
    setBusySlotId(releasing.id)
    try {
      const result = await releaseSlot(releasing.id)
      toast.success(
        result === 'offered'
          ? 'Plek vrijgegeven'
          : 'Plek vrijgegeven. Niemand past, ze staat nu open.',
      )
      setReleasing(null)
      refetchAll()
    } catch (caught) {
      toast.error(messageForError(caught))
    } finally {
      setBusySlotId(null)
    }
  }

  async function onSimulate(offerId: string, accept: boolean) {
    const slot = slots.slots.find((item) => item.current_offer_id === offerId)
    setBusySlotId(slot?.id ?? null)
    try {
      await simulateResponse(offerId, accept)
      refetchAll()
    } catch (caught) {
      toast.error(messageForError(caught))
    } finally {
      setBusySlotId(null)
    }
  }

  async function onToggleVip(entry: WaitlistEntry) {
    try {
      await setVip(entry.id, !entry.is_vip)
      void refetchWaitlist()
    } catch (caught) {
      toast.error(messageForError(caught))
    }
  }

  const notFound = salonStatus === 'ready' && salon === null && isSupabaseConfigured

  return (
    <>
      <AppHeader
        slug={slug}
        salonName={salon?.name}
        mode={mode}
        onOpenSettings={salon ? () => setSettingsOpen(true) : undefined}
      />

      <PageShell>
        <h1 className="sr-only">Dashboard van {salon?.name ?? 'de salon'}</h1>

        {!isSupabaseConfigured ? (
          <div className="mb-10">
            <ConfigNotice />
          </div>
        ) : null}

        {notFound ? (
          <div className="flex flex-col items-start gap-4">
            <h2 className="text-2xl">Deze salon bestaat niet</h2>
            <p className="text-ink-soft">Controleer de link in je adresbalk.</p>
            <Link to="/" className="font-bold text-blue underline">
              Naar de startpagina
            </Link>
          </div>
        ) : null}

        {salonStatus === 'error' ? (
          <ErrorState error={salonError} onRetry={() => void refetchSalon()} />
        ) : null}

        {salon ? (
          <div className="flex flex-col gap-12">
            <ImpactStrip impact={impact} />

            <div className="grid gap-12 lg:grid-cols-[2fr_1fr] lg:gap-10">
              <div className="flex flex-col gap-10">
                <MonthCalendar
                  monthKey={monthKey}
                  selectedDay={dayKey}
                  slots={slots.slots}
                  now={now}
                  onSelectDay={selectDay}
                  onChangeMonth={setMonthKey}
                />

                <section aria-labelledby="agenda-kop" className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h2 id="agenda-kop" className="text-xl">
                      {capitalise(formatDayLabel(brusselsMidnight(dayKey), now))}
                    </h2>
                    <p data-numeric className="text-ink-soft">
                      {daySlots.length === 0
                        ? 'Geen afspraken'
                        : daySlots.length === 1
                          ? '1 afspraak'
                          : `${daySlots.length} afspraken`}
                    </p>
                  </div>

                {slots.status === 'loading' ? <SkeletonAgenda /> : null}
                {slots.status === 'error' ? (
                  <ErrorState error={slots.error} onRetry={() => void refetchSlots()} />
                ) : null}
                {slots.status === 'ready' ? (
                  <AgendaTimeline
                    slots={daySlots}
                    salon={salon}
                    treatments={treatments}
                    offers={offers.offers}
                    entries={waitlist.entries}
                    now={now}
                    busySlotId={busySlotId}
                    onRelease={setReleasing}
                    onSimulate={onSimulate}
                  />
                ) : null}
                </section>
              </div>

              <div className="flex flex-col gap-12">
                <QrCard slug={slug} />
                <WaitlistPanel
                  entries={waitlist.entries}
                  treatments={treatments}
                  onToggleVip={onToggleVip}
                />
                <ActivityFeed events={events.events} />
              </div>
            </div>
          </div>
        ) : null}
      </PageShell>

      <ReleaseDialog
        slot={releasing}
        busy={busySlotId !== null}
        onConfirm={confirmRelease}
        onCancel={() => setReleasing(null)}
      />

      {salon ? (
        <SettingsDialog
          salon={salon}
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => {
            void refetchSalon()
            refetchAll()
          }}
        />
      ) : null}
    </>
  )
}
