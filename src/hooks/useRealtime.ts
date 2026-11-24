import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'

import { POLL_MS, REALTIME_DEBOUNCE_MS, REALTIME_TIMEOUT_MS } from '../config'
import { isSupabaseConfigured, supabase } from '../services/supabase'

export type SyncMode = 'live' | 'polling' | 'off'

interface Options {
  /** Unieke kanaalnaam per pagina. */
  key: string
  salonId: string | null
  tables: string[]
  onChange: () => void
}

/**
 * Realtime met polling-fallback (PLAN sectie 8). Komt het kanaal niet
 * binnen REALTIME_TIMEOUT_MS op SUBSCRIBED, dan pollen we elke POLL_MS.
 */
export function useRealtime({ key, salonId, tables, onChange }: Options): SyncMode {
  const [mode, setMode] = useState<SyncMode>('off')
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const tableKey = tables.join(',')

  useEffect(() => {
    if (!salonId || !isSupabaseConfigured) {
      setMode('off')
      return
    }

    let channel: RealtimeChannel | null = null
    let debounce: ReturnType<typeof setTimeout> | null = null
    let poll: ReturnType<typeof setInterval> | null = null
    let timeout: ReturnType<typeof setTimeout> | null = null
    let subscribed = false

    const fire = () => {
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(() => onChangeRef.current(), REALTIME_DEBOUNCE_MS)
    }

    const startPolling = () => {
      if (poll !== null) return
      setMode('polling')
      poll = setInterval(() => onChangeRef.current(), POLL_MS)
    }

    const stopPolling = () => {
      if (poll !== null) {
        clearInterval(poll)
        poll = null
      }
    }

    channel = supabase.channel(key)
    for (const table of tableKey.split(',')) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `salon_id=eq.${salonId}` },
        fire,
      )
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        subscribed = true
        stopPolling()
        setMode('live')
        onChangeRef.current()
        return
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        subscribed = false
        startPolling()
      }
    })

    timeout = setTimeout(() => {
      if (!subscribed) startPolling()
    }, REALTIME_TIMEOUT_MS)

    return () => {
      if (debounce) clearTimeout(debounce)
      if (timeout) clearTimeout(timeout)
      stopPolling()
      if (channel) void supabase.removeChannel(channel)
    }
  }, [key, salonId, tableKey])

  return mode
}
