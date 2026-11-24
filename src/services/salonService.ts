import type { Salon, Treatment } from '../domain/types'
import { supabase } from './supabase'

export async function getSalonBySlug(slug: string): Promise<Salon | null> {
  const { data, error } = await supabase.from('salons').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data as Salon | null
}

export async function getTreatments(salonId: string): Promise<Treatment[]> {
  const { data, error } = await supabase
    .from('treatments')
    .select('*')
    .eq('salon_id', salonId)
    .order('sort', { ascending: true })
  if (error) throw error
  return (data ?? []) as Treatment[]
}

export async function updateSettings(
  slug: string,
  settings: { lastMinuteDiscount: boolean; typicalWaitDays: number; vipDiscountPct: number },
): Promise<void> {
  const { error } = await supabase.rpc('update_salon_settings', {
    p_slug: slug,
    p_discount: settings.lastMinuteDiscount,
    p_typical_wait_days: settings.typicalWaitDays,
    p_vip_discount_pct: settings.vipDiscountPct,
  })
  if (error) throw error
}

export async function resetDemo(slug: string): Promise<void> {
  const { error } = await supabase.rpc('reset_demo', { p_slug: slug })
  if (error) throw error
}
