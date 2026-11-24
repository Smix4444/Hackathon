import type { Offer } from '../domain/types'
import { listOffersForSalon } from '../services/offerService'
import { useAsync } from './useAsync'

export function useOffers(salonId: string | null) {
  const state = useAsync<Offer[]>(
    () => listOffersForSalon(salonId as string),
    [salonId],
    Boolean(salonId),
  )

  return {
    offers: state.data ?? [],
    status: state.status,
    error: state.error,
    refetch: state.refetch,
  }
}
