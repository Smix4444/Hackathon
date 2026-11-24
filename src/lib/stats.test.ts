import { describe, expect, it } from 'vitest'
import type { Slot } from '../domain/types'
import { computeImpact, daysSaved } from './stats'

const now = new Date('2026-11-24T14:00:00Z')

function slot(partial: Partial<Slot>): Slot {
  return {
    id: crypto.randomUUID(),
    salon_id: 'salon',
    treatment_id: 'treatment',
    starts_at: '2026-11-24T15:00:00Z',
    ends_at: '2026-11-24T15:30:00Z',
    status: 'booked',
    customer_name: 'Tom',
    released_at: null,
    current_offer_id: null,
    filled_by_entry_id: null,
    filled_treatment_id: null,
    filled_at: null,
    final_price_cents: null,
    final_duration_min: null,
    created_at: '2026-11-24T08:00:00Z',
    ...partial,
  }
}

describe('computeImpact', () => {
  it('geeft nullen bij een lege lijst', () => {
    expect(computeImpact([], now)).toEqual({
      released: 0,
      filled: 0,
      fillRate: 0,
      recoveredMinutes: 0,
      recoveredCents: 0,
      avgFillSeconds: null,
    })
  })

  it('telt alleen wat vandaag is vrijgegeven', () => {
    const impact = computeImpact(
      [
        slot({ released_at: '2026-11-23T10:00:00Z', status: 'filled', final_duration_min: 30 }),
        slot({ released_at: '2026-11-24T10:00:00Z', status: 'free' }),
      ],
      now,
    )
    expect(impact.released).toBe(1)
    expect(impact.filled).toBe(0)
    expect(impact.recoveredMinutes).toBe(0)
  })

  it('telt teruggewonnen tijd, omzet en opvulratio', () => {
    const impact = computeImpact(
      [
        slot({
          released_at: '2026-11-24T10:00:00Z',
          filled_at: '2026-11-24T10:01:12Z',
          status: 'filled',
          final_duration_min: 45,
          final_price_cents: 4200,
        }),
        slot({
          released_at: '2026-11-24T11:00:00Z',
          filled_at: '2026-11-24T11:00:48Z',
          status: 'filled',
          final_duration_min: 90,
          final_price_cents: 8500,
        }),
        slot({ released_at: '2026-11-24T12:00:00Z', status: 'offered' }),
      ],
      now,
    )
    expect(impact.released).toBe(3)
    expect(impact.filled).toBe(2)
    expect(impact.fillRate).toBeCloseTo(2 / 3)
    expect(impact.recoveredMinutes).toBe(135)
    expect(impact.recoveredCents).toBe(12700)
    expect(impact.avgFillSeconds).toBe(60)
  })

  it('valt terug op de slotduur als final_duration_min leeg is', () => {
    const impact = computeImpact(
      [
        slot({
          released_at: '2026-11-24T10:00:00Z',
          status: 'filled',
          starts_at: '2026-11-24T16:00:00Z',
          ends_at: '2026-11-24T17:00:00Z',
        }),
      ],
      now,
    )
    expect(impact.recoveredMinutes).toBe(60)
    expect(impact.avgFillSeconds).toBeNull()
  })
})

describe('daysSaved', () => {
  it('rekent de gewonnen dagen', () => {
    expect(daysSaved(14, new Date('2026-11-24T09:00:00Z'), new Date('2026-11-24T15:00:00Z'))).toBe(13)
    expect(daysSaved(14, new Date('2026-11-24T09:00:00Z'), new Date('2026-11-27T15:00:00Z'))).toBe(10)
  })

  it('wordt nooit negatief', () => {
    expect(daysSaved(2, new Date('2026-11-24T09:00:00Z'), new Date('2026-12-24T09:00:00Z'))).toBe(0)
  })
})
