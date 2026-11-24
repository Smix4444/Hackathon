import type { WaitlistEntry } from '../domain/types'
import { supabase } from './supabase'

export async function listWaitlist(salonId: string): Promise<WaitlistEntry[]> {
  const { data, error } = await supabase
    .from('waitlist_entries')
    .select('*')
    .eq('salon_id', salonId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as WaitlistEntry[]
}

export async function getEntriesByIds(ids: string[]): Promise<WaitlistEntry[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase.from('waitlist_entries').select('*').in('id', ids)
  if (error) throw error
  return (data ?? []) as WaitlistEntry[]
}

export interface JoinPayload {
  salonSlug: string
  treatmentId: string
  firstName: string
  days: number[]
  timeFrom: string
  timeTo: string
  leadMinutes: number
  token: string
}

/** Geeft het id van de nieuwe inschrijving terug. */
export async function joinWaitlist(payload: JoinPayload): Promise<string> {
  const { data, error } = await supabase.rpc('join_waitlist', {
    p_salon_slug: payload.salonSlug,
    p_treatment: payload.treatmentId,
    p_first_name: payload.firstName,
    p_days: payload.days,
    p_from: payload.timeFrom,
    p_to: payload.timeTo,
    p_lead: payload.leadMinutes,
    p_token: payload.token,
  })
  if (error) throw error
  return data as string
}

export async function leaveWaitlist(entryId: string, token: string): Promise<void> {
  const { error } = await supabase.rpc('leave_waitlist', { p_entry: entryId, p_token: token })
  if (error) throw error
}

export async function setVip(entryId: string, vip: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_vip', { p_entry: entryId, p_vip: vip })
  if (error) throw error
}
