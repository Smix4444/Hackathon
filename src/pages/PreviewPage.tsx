import { useState } from 'react'

import { ClaimDialog } from '../components/customer/ClaimDialog'
import { FreeNowList } from '../components/customer/FreeNowList'
import { JoinForm } from '../components/customer/JoinForm'
import { OfferTakeover } from '../components/customer/OfferTakeover'
import { SuccessView } from '../components/customer/SuccessView'
import { WaitingCard } from '../components/customer/WaitingCard'
import { AppHeader } from '../components/layout/AppHeader'
import { ActivityFeed } from '../components/salon/ActivityFeed'
import { AgendaTimeline } from '../components/salon/AgendaTimeline'
import { DayNavigator } from '../components/salon/DayNavigator'
import { ImpactStrip } from '../components/salon/ImpactStrip'
import { QrCard } from '../components/salon/QrCard'
import { ReleaseDialog } from '../components/salon/ReleaseDialog'
import { SettingsDialog } from '../components/salon/SettingsDialog'
import { WaitlistPanel } from '../components/salon/WaitlistPanel'
import { Button } from '../components/ui/Button'
import type {
  ActivityEvent,
  BookingResult,
  Offer,
  Salon,
  Slot,
  Treatment,
  WaitlistEntry,
} from '../domain/types'
import { useNow } from '../hooks/useNow'
import { computeImpact } from '../lib/stats'
import { brusselsDayKey } from '../lib/time'

/**
 * Alleen in ontwikkeling: toont elk scherm met nepdata, zodat het ontwerp
 * te beoordelen is zonder database. Zit niet in de productiebuild.
 */

const now = new Date()
const at = (minutes: number) => new Date(now.getTime() + minutes * 60_000).toISOString()

const salon: Salon = {
  id: 'salon',
  slug: 'studio-noor',
  name: 'Studio Noor',
  city: 'Antwerpen',
  offer_seconds: 60,
  typical_wait_days: 14,
  last_minute_discount: true,
  vip_discount_pct: 10,
  created_at: at(-10000),
}

const treatments: Treatment[] = [
  { id: 't-cut', salon_id: 'salon', name: 'Knippen', duration_min: 30, price_cents: 3200, sort: 1 },
  {
    id: 't-beard',
    salon_id: 'salon',
    name: 'Knippen en baard',
    duration_min: 45,
    price_cents: 4200,
    sort: 2,
  },
  { id: 't-color', salon_id: 'salon', name: 'Kleuren', duration_min: 90, price_cents: 8500, sort: 3 },
  { id: 't-brush', salon_id: 'salon', name: 'Brushing', duration_min: 30, price_cents: 2800, sort: 4 },
]

function slot(partial: Partial<Slot> & { id: string }): Slot {
  return {
    salon_id: 'salon',
    treatment_id: 't-cut',
    starts_at: at(60),
    ends_at: at(90),
    status: 'booked',
    customer_name: 'Tom',
    released_at: null,
    current_offer_id: null,
    filled_by_entry_id: null,
    filled_treatment_id: null,
    filled_at: null,
    final_price_cents: null,
    final_duration_min: null,
    created_at: at(-600),
    ...partial,
  }
}

const slots: Slot[] = [
  slot({ id: 's1', starts_at: at(45), ends_at: at(75), customer_name: 'Tom' }),
  slot({
    id: 's2',
    starts_at: at(80),
    ends_at: at(125),
    treatment_id: 't-beard',
    customer_name: 'Milan',
  }),
  slot({
    id: 's3',
    starts_at: at(130),
    ends_at: at(160),
    status: 'free',
    customer_name: 'Yasmine',
    released_at: at(-4),
  }),
  slot({
    id: 's4',
    starts_at: at(170),
    ends_at: at(215),
    treatment_id: 't-beard',
    status: 'offered',
    customer_name: 'Arne',
    released_at: at(-1),
    current_offer_id: 'o1',
  }),
  slot({
    id: 's5',
    starts_at: at(230),
    ends_at: at(320),
    treatment_id: 't-color',
    status: 'filled',
    customer_name: 'Fatima',
    released_at: at(-62),
    filled_by_entry_id: 'e-sarah',
    filled_treatment_id: 't-color',
    filled_at: at(-61),
    final_price_cents: 8500,
    final_duration_min: 90,
  }),
]

const offers: Offer[] = [
  {
    id: 'o2',
    salon_id: 'salon',
    slot_id: 's4',
    entry_id: 'e-sarah',
    treatment_id: 't-cut',
    status: 'pending',
    price_cents: 2560,
    original_price_cents: 3200,
    created_at: at(-0.5),
    expires_at: at(10),
    responded_at: null,
  },
  {
    id: 'o1',
    salon_id: 'salon',
    slot_id: 's4',
    entry_id: 'e-bilal',
    treatment_id: 't-cut',
    status: 'pending',
    price_cents: 2880,
    original_price_cents: 3200,
    created_at: at(-0.5),
    expires_at: at(10),
    responded_at: null,
  },
]

function entry(partial: Partial<WaitlistEntry> & { id: string }): WaitlistEntry {
  return {
    salon_id: 'salon',
    treatment_id: 't-cut',
    first_name: 'Klant',
    days: [1, 2, 3, 4, 5],
    time_from: '09:00',
    time_to: '21:00',
    lead_minutes: 30,
    is_vip: false,
    is_demo: true,
    status: 'waiting',
    created_at: at(-4000),
    ...partial,
  }
}

const entries: WaitlistEntry[] = [
  entry({ id: 'e-bilal', first_name: 'Bilal', is_vip: true, status: 'offered', created_at: at(-1440) }),
  entry({ id: 'e-sarah', first_name: 'Sarah', created_at: at(-4320) }),
  entry({ id: 'e-hanne', first_name: 'Hanne', treatment_id: 't-color', created_at: at(-2880) }),
  entry({ id: 'e-lien', first_name: 'Lien', treatment_id: 't-brush', created_at: at(-300) }),
]

const events: ActivityEvent[] = [
  { id: 4, salon_id: 'salon', type: 'offered', slot_id: 's4', entry_id: 'e-bilal', message: 'Aangeboden aan Bilal', created_at: at(-1) },
  { id: 3, salon_id: 'salon', type: 'released', slot_id: 's4', entry_id: null, message: 'Arne zegde af voor 17:45', created_at: at(-1) },
  { id: 2, salon_id: 'salon', type: 'accepted', slot_id: 's5', entry_id: 'e-sarah', message: 'Sarah neemt 18:15 over', created_at: at(-61) },
  { id: 1, salon_id: 'salon', type: 'joined', slot_id: null, entry_id: 'e-lien', message: 'Lien staat op de wachtlijst', created_at: at(-300) },
]

const booking: BookingResult = {
  status: 'accepted',
  slot_id: 's5',
  starts_at: at(230),
  price_cents: 2880,
  original_price_cents: 3200,
  treatment: 'Knippen',
  duration_min: 30,
}

function Divider({ title }: { title: string }) {
  return (
    <div className="border-t border-line pt-10">
      <h2 className="text-2xl">{title}</h2>
    </div>
  )
}

export default function PreviewPage() {
  const nowTick = useNow()
  const [dayKey, setDayKey] = useState(() => brusselsDayKey(new Date()))
  const [releasing, setReleasing] = useState<Slot | null>(null)
  const [claiming, setClaiming] = useState<Slot | null>(null)
  const [offerOpen, setOfferOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const impact = computeImpact(slots, nowTick)

  return (
    <>
      <AppHeader
        slug="studio-noor"
        salonName={salon.name}
        mode="live"
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="mx-auto flex w-full max-w-[76rem] flex-col gap-10 px-5 pb-24 pt-8 sm:px-8">
        <div className="rounded-block border border-offer bg-offer-tint px-5 py-4">
          <p className="font-bold">Voorbeeldpagina met nepdata</p>
          <p className="text-ink-soft">
            Alleen zichtbaar tijdens ontwikkelen, zodat je het ontwerp kan bekijken voor de
            database er is. Knoppen openen wel de echte dialogen, maar bewaren niets.
          </p>
        </div>

        <Divider title="Salon-dashboard" />

        <ImpactStrip impact={impact} />

        <div className="grid gap-12 lg:grid-cols-[2fr_1fr] lg:gap-10">
          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-xl">Agenda</h3>
              <DayNavigator
                dayKey={dayKey}
                now={nowTick}
                count={slots.length}
                onChange={setDayKey}
              />
            </div>
            <AgendaTimeline
              slots={slots}
              salon={salon}
              treatments={treatments}
              offers={offers}
              entries={entries}
              now={nowTick}
              busySlotId={null}
              onRelease={setReleasing}
              onSimulate={() => undefined}
            />
          </section>

          <div className="flex flex-col gap-12">
            <QrCard slug="studio-noor" />
            <WaitlistPanel
              entries={entries}
              treatments={treatments}
              onToggleVip={() => undefined}
            />
            <ActivityFeed events={events} />
          </div>
        </div>

        <Divider title="Klantpagina" />

        <div className="grid gap-12 lg:grid-cols-2">
          <div className="flex max-w-[35rem] flex-col gap-10">
            <section className="flex flex-col gap-3">
              <h3 className="text-xl">Inschrijven</h3>
              <JoinForm
                treatments={treatments}
                busy={false}
                serverError={null}
                onSubmit={() => undefined}
              />
            </section>
          </div>

          <div className="flex max-w-[35rem] flex-col gap-10">
            <WaitingCard
              entry={entries[1]}
              allEntries={entries}
              treatment={treatments[0]}
              busy={false}
              onLeave={() => undefined}
            />

            <FreeNowList
              slots={slots}
              treatments={treatments}
              salon={salon}
              now={nowTick}
              onClaim={setClaiming}
            />

            <section className="flex flex-col gap-3">
              <h3 className="text-xl">Schermen die openen</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" onClick={() => setOfferOpen(true)}>
                  Toon het aanbod
                </Button>
                <Button variant="secondary" onClick={() => setShowSuccess((v) => !v)}>
                  {showSuccess ? 'Verberg het successcherm' : 'Toon het successcherm'}
                </Button>
              </div>
            </section>

            {showSuccess ? (
              <SuccessView
                booking={booking}
                salon={salon}
                joinedAt={new Date(entries[1].created_at)}
                now={nowTick}
                onBack={() => setShowSuccess(false)}
              />
            ) : null}
          </div>
        </div>
      </main>

      <ReleaseDialog
        slot={releasing}
        busy={false}
        onConfirm={() => setReleasing(null)}
        onCancel={() => setReleasing(null)}
      />

      <ClaimDialog
        slot={claiming}
        treatment={treatments[0]}
        now={nowTick}
        busy={false}
        serverError={null}
        onConfirm={() => setClaiming(null)}
        onCancel={() => setClaiming(null)}
      />

      <SettingsDialog
        salon={salon}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={() => undefined}
      />

      {offerOpen ? (
        <OfferTakeover
          offer={offers[0]}
          slot={slots[3]}
          treatment={treatments[0]}
          salon={salon}
          isVip
          now={nowTick}
          busy={false}
          onAccept={() => setOfferOpen(false)}
          onDecline={() => setOfferOpen(false)}
          onClose={() => setOfferOpen(false)}
        />
      ) : null}
    </>
  )
}
