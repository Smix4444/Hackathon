export type SlotStatus = 'booked' | 'free' | 'offered' | 'filled'
export type EntryStatus = 'waiting' | 'offered' | 'booked' | 'left'
export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'expired'

export type EventType =
  | 'released'
  | 'offered'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'no_match'
  | 'joined'
  | 'claimed'
  | 'left'

export interface Salon {
  id: string
  slug: string
  name: string
  city: string
  offer_seconds: number
  typical_wait_days: number
  last_minute_discount: boolean
  /** Extra korting voor vaste klanten, in procent. */
  vip_discount_pct: number
  created_at: string
}

export interface Treatment {
  id: string
  salon_id: string
  name: string
  duration_min: number
  price_cents: number
  sort: number
}

export interface Slot {
  id: string
  salon_id: string
  treatment_id: string
  starts_at: string
  ends_at: string
  status: SlotStatus
  customer_name: string | null
  released_at: string | null
  current_offer_id: string | null
  filled_by_entry_id: string | null
  filled_treatment_id: string | null
  filled_at: string | null
  final_price_cents: number | null
  final_duration_min: number | null
  created_at: string
}

export interface WaitlistEntry {
  id: string
  salon_id: string
  treatment_id: string
  first_name: string
  days: number[]
  time_from: string
  time_to: string
  lead_minutes: number
  is_vip: boolean
  is_demo: boolean
  status: EntryStatus
  created_at: string
}

export interface Offer {
  id: string
  salon_id: string
  slot_id: string
  entry_id: string
  treatment_id: string
  status: OfferStatus
  price_cents: number
  original_price_cents: number
  created_at: string
  expires_at: string
  responded_at: string | null
}

export interface ActivityEvent {
  id: number
  salon_id: string
  type: EventType
  slot_id: string | null
  entry_id: string | null
  message: string
  created_at: string
}

/** Wat we per inschrijving in localStorage bewaren. */
export interface MyEntry {
  entryId: string
  token: string
  salonSlug: string
  firstName: string
}

/** Antwoord van accept_offer / claim_free_slot. */
export interface BookingResult {
  status: 'accepted'
  entry_id?: string
  slot_id: string
  starts_at: string
  price_cents: number
  original_price_cents: number
  treatment: string
  duration_min: number
}
