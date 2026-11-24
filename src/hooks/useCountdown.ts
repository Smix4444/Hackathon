import { useNow } from './useNow'

export interface Countdown {
  /** Resterende milliseconden, nooit negatief. */
  remainingMs: number
  /** 1 bij de start, 0 als de tijd om is. Voor de tijdbalk. */
  fraction: number
  expired: boolean
}

/** Telt af naar `expiresAt`, met de totale duur voor de balk. */
export function useCountdown(expiresAt: string | null, totalSeconds: number): Countdown {
  const now = useNow()
  if (!expiresAt) return { remainingMs: 0, fraction: 0, expired: true }

  const remainingMs = Math.max(0, new Date(expiresAt).getTime() - now.getTime())
  const totalMs = Math.max(1, totalSeconds * 1000)
  return {
    remainingMs,
    fraction: Math.min(1, remainingMs / totalMs),
    expired: remainingMs === 0,
  }
}
