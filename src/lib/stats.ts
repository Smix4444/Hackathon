import type { Slot } from '../domain/types'
import { brusselsDayKey, slotMinutes } from './time'

export interface Impact {
  released: number
  filled: number
  /** 0..1 */
  fillRate: number
  recoveredMinutes: number
  recoveredCents: number
  /** Gemiddelde tijd tussen vrijgeven en invullen, null als er niets ingevuld is. */
  avgFillSeconds: number | null
}

/** Impact van VANDAAG: slots die vandaag (Brussel) zijn vrijgegeven. */
export function computeImpact(slots: Slot[], now: Date): Impact {
  const today = brusselsDayKey(now)
  const releasedToday = slots.filter(
    (s) => s.released_at !== null && brusselsDayKey(new Date(s.released_at)) === today,
  )

  const filledSlots = releasedToday.filter((s) => s.status === 'filled')

  let recoveredMinutes = 0
  let recoveredCents = 0
  const fillDurations: number[] = []

  for (const slot of filledSlots) {
    recoveredMinutes += slot.final_duration_min ?? slotMinutes(slot.starts_at, slot.ends_at)
    recoveredCents += slot.final_price_cents ?? 0
    if (slot.filled_at && slot.released_at) {
      const seconds =
        (new Date(slot.filled_at).getTime() - new Date(slot.released_at).getTime()) / 1000
      if (seconds >= 0) fillDurations.push(seconds)
    }
  }

  return {
    released: releasedToday.length,
    filled: filledSlots.length,
    fillRate: releasedToday.length === 0 ? 0 : filledSlots.length / releasedToday.length,
    recoveredMinutes,
    recoveredCents,
    avgFillSeconds:
      fillDurations.length === 0
        ? null
        : fillDurations.reduce((a, b) => a + b, 0) / fillDurations.length,
  }
}

/**
 * "X dagen sneller geholpen": de gewone wachttijd min de dagen tussen
 * inschrijven en de afspraak. Nooit negatief.
 */
export function daysSaved(typicalWaitDays: number, joinedAt: Date, slotStart: Date): number {
  const diffDays = Math.max(
    0,
    Math.ceil((slotStart.getTime() - joinedAt.getTime()) / 86_400_000),
  )
  return Math.max(0, typicalWaitDays - diffDays)
}
