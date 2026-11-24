import type { Slot } from '../domain/types'

/**
 * Een vrij slot kan twee dingen betekenen:
 *   - released_at gezet: iemand heeft afgezegd, dit is een gat in de agenda
 *     (koraal, last-minute prijs, het hart van Replannr);
 *   - released_at leeg: een gewoon vrij uur dat nog nooit geboekt was en
 *     dat een klant zelf kan reserveren.
 */
export function isGap(slot: Slot): boolean {
  return slot.status === 'free' && slot.released_at !== null
}

/** Vrij uur dat nog nooit geboekt was. */
export function isOpenHour(slot: Slot): boolean {
  return slot.status === 'free' && slot.released_at === null
}

/** Te boeken: vrij en nog niet begonnen. */
export function isBookable(slot: Slot, now: Date): boolean {
  return slot.status === 'free' && new Date(slot.starts_at).getTime() > now.getTime()
}
