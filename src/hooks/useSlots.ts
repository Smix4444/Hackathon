import { brusselsDayStart } from '../lib/time'
import type { Slot } from '../domain/types'
import { listSlots } from '../services/slotService'
import { useAsync } from './useAsync'

/** Alle slots van vandaag en morgen (Brusselse dagen). */
export function useSlots(salonId: string | null) {
  const state = useAsync<Slot[]>(
    () => {
      const now = new Date()
      return listSlots(salonId as string, brusselsDayStart(now, 0), brusselsDayStart(now, 2))
    },
    [salonId],
    Boolean(salonId),
  )

  return { slots: state.data ?? [], status: state.status, error: state.error, refetch: state.refetch }
}
