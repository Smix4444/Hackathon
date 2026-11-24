import type { ActivityEvent } from '../domain/types'
import { supabase } from './supabase'

export async function listEvents(salonId: string, limit: number): Promise<ActivityEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('salon_id', salonId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as ActivityEvent[]
}
