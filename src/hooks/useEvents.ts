import { FEED_LIMIT } from '../config'
import type { ActivityEvent } from '../domain/types'
import { listEvents } from '../services/eventService'
import { useAsync } from './useAsync'

export function useEvents(salonId: string | null) {
  const state = useAsync<ActivityEvent[]>(
    () => listEvents(salonId as string, FEED_LIMIT),
    [salonId],
    Boolean(salonId),
  )

  return {
    events: state.data ?? [],
    status: state.status,
    error: state.error,
    refetch: state.refetch,
  }
}
