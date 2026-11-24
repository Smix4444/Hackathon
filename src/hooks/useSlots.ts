import { brusselsDayStart } from '../lib/time'
import type { Slot } from '../domain/types'
import { listSlots } from '../services/slotService'
import { useAsync } from './useAsync'

/** Vanaf vandaag zoveel dagen vooruit ophalen. */
export const SLOT_WINDOW_DAYS = 14

/** Alle slots van vandaag tot en met twee weken vooruit (Brusselse dagen). */
export function useSlots(salonId: string | null) {
  const state = useAsync<Slot[]>(
    () => {
      const now = new Date()
      return listSlots(
        salonId as string,
        brusselsDayStart(now, 0),
        brusselsDayStart(now, SLOT_WINDOW_DAYS),
      )
    },
    [salonId],
    Boolean(salonId),
  )

  return { slots: state.data ?? [], status: state.status, error: state.error, refetch: state.refetch }
}
