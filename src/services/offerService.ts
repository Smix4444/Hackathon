import type { BookingResult, Offer } from '../domain/types'
import { supabase } from './supabase'

export async function listOffersForSalon(salonId: string): Promise<Offer[]> {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('salon_id', salonId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Offer[]
}

export async function listOffersForEntries(entryIds: string[]): Promise<Offer[]> {
  if (entryIds.length === 0) return []
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .in('entry_id', entryIds)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Offer[]
}

export async function acceptOffer(offerId: string, token: string): Promise<BookingResult> {
  const { data, error } = await supabase.rpc('accept_offer', { p_offer: offerId, p_token: token })
  if (error) throw error
  return data as BookingResult
}

export async function declineOffer(offerId: string, token: string): Promise<void> {
  const { error } = await supabase.rpc('decline_offer', { p_offer: offerId, p_token: token })
  if (error) throw error
}

/** Alleen voor demo-klanten (S8). */
export async function simulateResponse(offerId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('simulate_response', { p_offer: offerId, p_accept: accept })
  if (error) throw error
}

/** Idempotent; elke open pagina mag dit aanroepen. */
export async function expireOffers(): Promise<number> {
  const { data, error } = await supabase.rpc('expire_offers')
  if (error) throw error
  return typeof data === 'number' ? data : 0
}
