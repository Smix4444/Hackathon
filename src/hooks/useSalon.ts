import type { Salon, Treatment } from '../domain/types'
import { getSalonBySlug, getTreatments } from '../services/salonService'
import { isSupabaseConfigured } from '../services/supabase'
import { useAsync } from './useAsync'

export function useSalon(slug: string) {
  const state = useAsync<{ salon: Salon | null; treatments: Treatment[] }>(
    async () => {
      const salon = await getSalonBySlug(slug)
      if (!salon) return { salon: null, treatments: [] }
      return { salon, treatments: await getTreatments(salon.id) }
    },
    [slug],
    isSupabaseConfigured,
  )

  return {
    salon: state.data?.salon ?? null,
    treatments: state.data?.treatments ?? [],
    status: state.status,
    error: state.error,
    refetch: state.refetch,
  }
}
