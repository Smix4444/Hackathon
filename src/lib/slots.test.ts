import { describe, expect, it } from 'vitest'
import type { Slot } from '../domain/types'
import { isBookable, isGap, isOpenHour } from './slots'

const now = new Date('2026-11-24T12:00:00Z')

function slot(partial: Partial<Slot>): Slot {
  return {
    id: 'slot',
    salon_id: 'salon',
    treatment_id: 'knippen',
    starts_at: '2026-11-24T15:00:00Z',
    ends_at: '2026-11-24T15:30:00Z',
    status: 'free',
    customer_name: null,
    released_at: null,
    current_offer_id: null,
    filled_by_entry_id: null,
    filled_treatment_id: null,
    filled_at: null,
    final_price_cents: null,
    final_duration_min: null,
    created_at: '2026-11-20T08:00:00Z',
    ...partial,
  }
}

describe('soorten vrije plekken', () => {
  it('ziet een vrijgekomen plek als gat', () => {
    const gap = slot({ released_at: '2026-11-24T11:00:00Z' })
    expect(isGap(gap)).toBe(true)
    expect(isOpenHour(gap)).toBe(false)
  })

  it('ziet een nooit geboekt uur als gewoon vrij uur', () => {
    expect(isOpenHour(slot({}))).toBe(true)
    expect(isGap(slot({}))).toBe(false)
  })

  it('rekent een geboekt slot geen van beide', () => {
    const booked = slot({ status: 'booked', customer_name: 'Tom' })
    expect(isGap(booked)).toBe(false)
    expect(isOpenHour(booked)).toBe(false)
  })

  it('is enkel boekbaar in de toekomst', () => {
    expect(isBookable(slot({}), now)).toBe(true)
    expect(isBookable(slot({ starts_at: '2026-11-24T09:00:00Z' }), now)).toBe(false)
    expect(isBookable(slot({ status: 'offered' }), now)).toBe(false)
  })
})
