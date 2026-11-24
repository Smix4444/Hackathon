import type { BookingResult, Slot } from '../domain/types'
import { supabase } from './supabase'

/** Slots met een starttijd in [from, to). */
export async function listSlots(salonId: string, from: Date, to: Date): Promise<Slot[]> {
  const { data, error } = await supabase
    .from('slots')
    .select('*')
    .eq('salon_id', salonId)
    .gte('starts_at', from.toISOString())
    .lt('starts_at', to.toISOString())
    .order('starts_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as Slot[]
}

/** Geeft 'offered' als er meteen iemand paste, anders 'free'. */
export async function releaseSlot(slotId: string): Promise<'offered' | 'free'> {
  const { data, error } = await supabase.rpc('release_slot', { p_slot: slotId })
  if (error) throw error
  return data === 'offered' ? 'offered' : 'free'
}

export async function claimFreeSlot(
  slotId: string,
  firstName: string,
  token: string,
): Promise<BookingResult> {
  const { data, error } = await supabase.rpc('claim_free_slot', {
    p_slot: slotId,
    p_first_name: firstName,
    p_token: token,
  })
  if (error) throw error
  return data as BookingResult
}
