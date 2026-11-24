import type { Offer, Salon, Slot, Treatment, WaitlistEntry } from '../../domain/types'
import { EmptyState } from '../ui/EmptyState'
import { SlotBlock } from './SlotBlock'

export function AgendaTimeline({
  slots,
  salon,
  treatments,
  offers,
  entries,
  now,
  busySlotId,
  onRelease,
  onSimulate,
}: {
  slots: Slot[]
  salon: Salon
  treatments: Treatment[]
  offers: Offer[]
  entries: WaitlistEntry[]
  now: Date
  busySlotId: string | null
  onRelease: (slot: Slot) => void
  onSimulate: (offerId: string, accept: boolean) => void
}) {
  if (slots.length === 0) {
    return <EmptyState>Geen afspraken op deze dag.</EmptyState>
  }

  const treatmentById = new Map(treatments.map((t) => [t.id, t]))
  const entryById = new Map(entries.map((e) => [e.id, e]))

  // Openstaande uitnodigingen per slot: dat is nu de hele wachtrij, niet één persoon.
  const pendingBySlot = new Map<string, typeof offers>()
  for (const offer of offers) {
    if (offer.status !== 'pending') continue
    const list = pendingBySlot.get(offer.slot_id) ?? []
    list.push(offer)
    pendingBySlot.set(offer.slot_id, list)
  }

  return (
    <ol className="flex flex-col gap-3">
      {slots.map((slot) => (
        <li key={slot.id}>
          <SlotBlock
            slot={slot}
            salon={salon}
            treatment={treatmentById.get(slot.treatment_id)}
            filledTreatment={
              slot.filled_treatment_id ? treatmentById.get(slot.filled_treatment_id) : undefined
            }
            pendingOffers={pendingBySlot.get(slot.id) ?? []}
            entryById={entryById}
            filledEntry={
              slot.filled_by_entry_id ? entryById.get(slot.filled_by_entry_id) ?? null : null
            }
            now={now}
            busy={busySlotId === slot.id}
            onRelease={() => onRelease(slot)}
            onSimulate={onSimulate}
          />
        </li>
      ))}
    </ol>
  )
}
