import { useCallback, useState } from 'react'

import type { MyEntry, Offer, WaitlistEntry } from '../domain/types'
import { listOffersForEntries } from '../services/offerService'
import { isSupabaseConfigured } from '../services/supabase'
import { getEntriesByIds } from '../services/waitlistService'
import { entriesForSalon } from '../storage/local'
import { useAsync } from './useAsync'

/**
 * Mijn inschrijvingen uit localStorage, samen met hun live status en
 * aanbiedingen uit de database.
 */
export function useMyEntries(slug: string) {
  const [mine, setMine] = useState<MyEntry[]>(() => entriesForSalon(slug))

  const refreshLocal = useCallback(() => {
    setMine(entriesForSalon(slug))
  }, [slug])

  const idKey = mine
    .map((entry) => entry.entryId)
    .sort()
    .join(',')

  const state = useAsync<{ entries: WaitlistEntry[]; offers: Offer[] }>(
    async () => {
      const ids = idKey === '' ? [] : idKey.split(',')
      if (ids.length === 0) return { entries: [], offers: [] }
      const [entries, offers] = await Promise.all([
        getEntriesByIds(ids),
        listOffersForEntries(ids),
      ])
      return { entries, offers }
    },
    [idKey],
    isSupabaseConfigured,
  )

  const tokenFor = useCallback(
    (entryId: string) => mine.find((entry) => entry.entryId === entryId)?.token ?? null,
    [mine],
  )

  return {
    mine,
    entries: state.data?.entries ?? [],
    offers: state.data?.offers ?? [],
    status: state.status,
    error: state.error,
    refetch: state.refetch,
    refreshLocal,
    tokenFor,
  }
}
