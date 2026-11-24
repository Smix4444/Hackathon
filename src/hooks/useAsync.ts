import { useCallback, useEffect, useRef, useState } from 'react'

export type AsyncStatus = 'loading' | 'ready' | 'error'

export interface AsyncState<T> {
  data: T | null
  status: AsyncStatus
  error: unknown
  refetch: () => Promise<void>
}

/**
 * Haalt data op en houdt status bij. `deps` bepaalt wanneer er opnieuw
 * geladen wordt; `enabled` laat een hook wachten tot hij genoeg weet.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: readonly unknown[],
  enabled = true,
): AsyncState<T> {
  const fnRef = useRef(fn)
  fnRef.current = fn

  const [data, setData] = useState<T | null>(null)
  const [status, setStatus] = useState<AsyncStatus>(enabled ? 'loading' : 'ready')
  const [error, setError] = useState<unknown>(null)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const refetch = useCallback(async () => {
    if (!enabled) return
    try {
      const result = await fnRef.current()
      if (!alive.current) return
      setData(result)
      setError(null)
      setStatus('ready')
    } catch (caught) {
      if (!alive.current) return
      setError(caught)
      setStatus('error')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data, status, error, refetch }
}
