import type { Slot } from '../domain/types'
import { listSlots } from '../services/slotService'
import { useAsync } from './useAsync'

/**
 * Slots in een vrij te kiezen venster. Het dashboard vraagt de zichtbare
 * maand op, plus vandaag, zodat de impactstrook blijft kloppen als je
 * door de maanden bladert.
 */
export function useSlots(salonId: string | null, from: Date, to: Date) {
  const fromIso = from.toISOString()
  const toIso = to.toISOString()

  const state = useAsync<Slot[]>(
    () => listSlots(salonId as string, new Date(fromIso), new Date(toIso)),
    [salonId, fromIso, toIso],
    Boolean(salonId),
  )

  return { slots: state.data ?? [], status: state.status, error: state.error, refetch: state.refetch }
}
