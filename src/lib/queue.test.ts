import { describe, expect, it } from 'vitest'
import type { WaitlistEntry } from '../domain/types'
import { ordinalNl, waitlistPosition } from './queue'

function entry(partial: Partial<WaitlistEntry> & { id: string }): WaitlistEntry {
  return {
    salon_id: 'salon',
    treatment_id: 'knippen',
    first_name: 'Klant',
    days: [1, 2, 3, 4, 5],
    time_from: '09:00',
    time_to: '21:00',
    lead_minutes: 30,
    is_vip: false,
    is_demo: false,
    status: 'waiting',
    created_at: '2026-11-24T09:00:00Z',
    ...partial,
  }
}

describe('waitlistPosition', () => {
  const entries = [
    entry({ id: 'a', created_at: '2026-11-20T09:00:00Z' }),
    entry({ id: 'b', created_at: '2026-11-21T09:00:00Z' }),
    entry({ id: 'c', created_at: '2026-11-22T09:00:00Z' }),
  ]

  it('sorteert op inschrijfmoment', () => {
    expect(waitlistPosition(entries, 'a')).toBe(1)
    expect(waitlistPosition(entries, 'c')).toBe(3)
  })

  it('zet een VIP vooraan', () => {
    const withVip = [...entries, entry({ id: 'vip', is_vip: true, created_at: '2026-11-23T09:00:00Z' })]
    expect(waitlistPosition(withVip, 'vip')).toBe(1)
    expect(waitlistPosition(withVip, 'a')).toBe(2)
  })

  it('kijkt alleen naar dezelfde behandeling', () => {
    const mixed = [
      entry({ id: 'kleur', treatment_id: 'kleuren', created_at: '2026-11-19T09:00:00Z' }),
      ...entries,
    ]
    expect(waitlistPosition(mixed, 'a')).toBe(1)
    expect(waitlistPosition(mixed, 'kleur')).toBe(1)
  })

  it('geeft null voor wie niet meer in de rij staat', () => {
    expect(waitlistPosition(entries, 'onbekend')).toBeNull()
    expect(waitlistPosition([entry({ id: 'weg', status: 'left' })], 'weg')).toBeNull()
    expect(waitlistPosition([entry({ id: 'klaar', status: 'booked' })], 'klaar')).toBeNull()
  })

  it('houdt wie een aanbod heeft in de rij', () => {
    expect(waitlistPosition([entry({ id: 'x', status: 'offered' })], 'x')).toBe(1)
  })
})

describe('ordinalNl', () => {
  it('schrijft rangtelwoorden', () => {
    expect(ordinalNl(1)).toBe('1e')
    expect(ordinalNl(2)).toBe('2e')
    expect(ordinalNl(8)).toBe('8ste')
  })
})
