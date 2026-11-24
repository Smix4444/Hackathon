import { describe, expect, it } from 'vitest'
import { nextPriceDrop, priceFor } from './pricing'

const base = 3200
const now = new Date('2026-11-24T12:00:00Z')
const inMinutes = (m: number) => new Date(now.getTime() + m * 60_000)

describe('priceFor', () => {
  it('rekent de volle prijs ver van de start', () => {
    expect(priceFor(base, inMinutes(600), now, true)).toEqual({ cents: 3200, pct: 0 })
  })

  it('geeft -10 % net onder 180 minuten, niets op 180', () => {
    expect(priceFor(base, inMinutes(180), now, true)).toEqual({ cents: 3200, pct: 0 })
    expect(priceFor(base, inMinutes(179), now, true)).toEqual({ cents: 2880, pct: 10 })
  })

  it('geeft -20 % net onder 60 minuten, -10 % op 60', () => {
    expect(priceFor(base, inMinutes(60), now, true)).toEqual({ cents: 2880, pct: 10 })
    expect(priceFor(base, inMinutes(59), now, true)).toEqual({ cents: 2560, pct: 20 })
  })

  it('geeft -30 % net onder 30 minuten, -20 % op 30', () => {
    expect(priceFor(base, inMinutes(30), now, true)).toEqual({ cents: 2560, pct: 20 })
    expect(priceFor(base, inMinutes(29), now, true)).toEqual({ cents: 2240, pct: 30 })
  })

  it('laat de prijs ongemoeid als de korting uit staat', () => {
    expect(priceFor(base, inMinutes(5), now, false)).toEqual({ cents: 3200, pct: 0 })
  })

  it('rondt af zoals de SQL-functie', () => {
    expect(priceFor(4200, inMinutes(10), now, true).cents).toBe(2940)
    expect(priceFor(8500, inMinutes(45), now, true).cents).toBe(6800)
  })
})

describe('nextPriceDrop', () => {
  it('kondigt de eerste daling aan', () => {
    const drop = nextPriceDrop(base, inMinutes(200), now, true)
    expect(drop).toEqual({ inMs: 20 * 60_000, cents: 2880, pct: 10 })
  })

  it('kondigt de volgende trede aan', () => {
    expect(nextPriceDrop(base, inMinutes(100), now, true)).toEqual({
      inMs: 40 * 60_000,
      cents: 2560,
      pct: 20,
    })
    expect(nextPriceDrop(base, inMinutes(45), now, true)).toEqual({
      inMs: 15 * 60_000,
      cents: 2240,
      pct: 30,
    })
  })

  it('geeft null onder 30 minuten', () => {
    expect(nextPriceDrop(base, inMinutes(29), now, true)).toBeNull()
  })

  it('geeft null als de korting uit staat of het slot voorbij is', () => {
    expect(nextPriceDrop(base, inMinutes(200), now, false)).toBeNull()
    expect(nextPriceDrop(base, inMinutes(-5), now, true)).toBeNull()
  })
})
