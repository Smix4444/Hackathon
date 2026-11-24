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
  const offerById = new Map(offers.map((o) => [o.id, o]))
  const entryById = new Map(entries.map((e) => [e.id, e]))

  return (
    <ol className="flex flex-col gap-3">
      {slots.map((slot) => {
        const offer = slot.current_offer_id ? offerById.get(slot.current_offer_id) ?? null : null
        return (
          <li key={slot.id}>
            <SlotBlock
              slot={slot}
              salon={salon}
              treatment={treatmentById.get(slot.treatment_id)}
              filledTreatment={
                slot.filled_treatment_id ? treatmentById.get(slot.filled_treatment_id) : undefined
              }
              offer={offer}
              offerEntry={offer ? entryById.get(offer.entry_id) ?? null : null}
              filledEntry={
                slot.filled_by_entry_id ? entryById.get(slot.filled_by_entry_id) ?? null : null
              }
              now={now}
              busy={busySlotId === slot.id}
              onRelease={() => onRelease(slot)}
              onSimulate={(accept) => {
                if (offer) onSimulate(offer.id, accept)
              }}
            />
          </li>
        )
      })}
    </ol>
  )
}
