import { useCallback, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { AppHeader } from '../components/layout/AppHeader'
import { PageShell } from '../components/layout/PageShell'
import { ActivityFeed } from '../components/salon/ActivityFeed'
import { AgendaTimeline } from '../components/salon/AgendaTimeline'
import { DayTabs, type DayKey } from '../components/salon/DayTabs'
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
import { brusselsDayKey, brusselsDayStart } from '../lib/time'
import { simulateResponse } from '../services/offerService'
import { releaseSlot } from '../services/slotService'
import { isSupabaseConfigured } from '../services/supabase'
import { setVip } from '../services/waitlistService'

export function DashboardPage() {
  const { slug = DEMO_SLUG } = useParams()
  const now = useNow()
  const [params, setParams] = useSearchParams()
  const day: DayKey = params.get('dag') === 'morgen' ? 'morgen' : 'vandaag'

  const {
    salon,
    treatments,
    status: salonStatus,
    error: salonError,
    refetch: refetchSalon,
  } = useSalon(slug)
  const salonId = salon?.id ?? null

  const slots = useSlots(salonId)
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
  const dayKey = useMemo(
    () => brusselsDayKey(brusselsDayStart(new Date(`${todayKey}T12:00:00Z`), day === 'morgen' ? 1 : 0)),
    [day, todayKey],
  )

  const daySlots = slots.slots.filter((slot) => brusselsDayKey(new Date(slot.starts_at)) === dayKey)
  const impact = computeImpact(slots.slots, now)

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
              <section aria-labelledby="agenda-kop" className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h2 id="agenda-kop" className="text-xl">
                    Agenda
                  </h2>
                  <DayTabs
                    value={day}
                    onChange={(next) => {
                      const nextParams = new URLSearchParams(params)
                      if (next === 'vandaag') nextParams.delete('dag')
                      else nextParams.set('dag', next)
                      setParams(nextParams, { replace: true })
                    }}
                  />
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
