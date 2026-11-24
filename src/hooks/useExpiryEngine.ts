import { useEffect, useRef } from 'react'

import { EXPIRE_THROTTLE_MS } from '../config'
import type { Offer } from '../domain/types'
import { expireOffers } from '../services/offerService'
import { isSupabaseConfigured } from '../services/supabase'
import { useNow } from './useNow'

/**
 * Ziet een open pagina een aanbod dat verlopen is, dan port ze de server.
 * De server beslist; wij vragen alleen om op te ruimen. Hoogstens één
 * aanroep per EXPIRE_THROTTLE_MS.
 */
export function useExpiryEngine(offers: Offer[] | null): void {
  const now = useNow()
  const lastCall = useRef(0)

  const hasExpired = (offers ?? []).some(
    (offer) => offer.status === 'pending' && new Date(offer.expires_at).getTime() < now.getTime(),
  )

  useEffect(() => {
    if (!hasExpired || !isSupabaseConfigured) return
    const since = Date.now() - lastCall.current
    if (since < EXPIRE_THROTTLE_MS) return
    lastCall.current = Date.now()
    void expireOffers().catch(() => {
      // Mislukt het, dan probeert de volgende tik opnieuw.
    })
  }, [hasExpired, now])
}
