import type { WaitlistEntry } from '../domain/types'
import { listWaitlist } from '../services/waitlistService'
import { useAsync } from './useAsync'

export function useWaitlist(salonId: string | null) {
  const state = useAsync<WaitlistEntry[]>(
    () => listWaitlist(salonId as string),
    [salonId],
    Boolean(salonId),
  )

  return {
    entries: state.data ?? [],
    status: state.status,
    error: state.error,
    refetch: state.refetch,
  }
}
