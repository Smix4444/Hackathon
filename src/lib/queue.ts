import type { WaitlistEntry } from '../domain/types'

/**
 * Positie in de rij voor dezelfde behandeling: VIP's eerst, daarna
 * wie zich het langst geleden inschreef. 1-gebaseerd, null als de
 * inschrijving niet (meer) in de rij staat.
 */
export function waitlistPosition(entries: WaitlistEntry[], entryId: string): number | null {
  const me = entries.find((e) => e.id === entryId)
  if (!me) return null
  if (me.status !== 'waiting' && me.status !== 'offered') return null

  const queue = entries
    .filter(
      (e) =>
        e.treatment_id === me.treatment_id &&
        (e.status === 'waiting' || e.status === 'offered'),
    )
    .sort((a, b) => {
      if (a.is_vip !== b.is_vip) return a.is_vip ? -1 : 1
      return a.created_at.localeCompare(b.created_at)
    })

  const index = queue.findIndex((e) => e.id === entryId)
  return index === -1 ? null : index + 1
}

/** "2e in de rij" — Nederlandse rangtelwoorden. */
export function ordinalNl(n: number): string {
  if (n === 1) return '1e'
  if (n === 8 || n === 80 || n === 100) return `${n}ste`
  return `${n}e`
}
