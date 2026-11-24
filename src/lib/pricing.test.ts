import { describe, expect, it } from 'vitest'
import { nextPriceDrop, priceFor } from './pricing'

const base = 3200
const now = new Date('2026-11-24T12:00:00Z')
const inMinutes = (m: number) => new Date(now.getTime() + m * 60_000)

describe('priceFor', () => {
  it('rekent de volle prijs ver van de start', () => {
    expect(priceFor(base, inMinutes(600), now, true)).toEqual({ cents: 3200, pct: 0, vipPct: 0 })
  })

  it('geeft -20 % net onder 120 minuten, niets op 120', () => {
    expect(priceFor(base, inMinutes(120), now, true).cents).toBe(3200)
    expect(priceFor(base, inMinutes(119), now, true)).toEqual({ cents: 2560, pct: 20, vipPct: 0 })
  })

  it('geeft -30 % net onder 60 minuten, -20 % op 60', () => {
    expect(priceFor(base, inMinutes(60), now, true).pct).toBe(20)
    expect(priceFor(base, inMinutes(59), now, true)).toEqual({ cents: 2240, pct: 30, vipPct: 0 })
  })

  it('geeft -40 % net onder 30 minuten, -30 % op 30', () => {
    expect(priceFor(base, inMinutes(30), now, true).pct).toBe(30)
    expect(priceFor(base, inMinutes(29), now, true)).toEqual({ cents: 1920, pct: 40, vipPct: 0 })
  })

  it('laat de prijs ongemoeid als de korting uit staat', () => {
    expect(priceFor(base, inMinutes(5), now, false)).toEqual({ cents: 3200, pct: 0, vipPct: 0 })
  })

  it('geeft een vaste klant korting bovenop de last-minute prijs', () => {
    // 3200 -> -20 % = 2560 -> -10 % vaste klant = 2304
    expect(priceFor(base, inMinutes(119), now, true, true, 10)).toEqual({
      cents: 2304,
      pct: 20,
      vipPct: 10,
    })
  })

  it('geeft een vaste klant ook korting zonder last-minute korting', () => {
    expect(priceFor(base, inMinutes(600), now, false, true, 10)).toEqual({
      cents: 2880,
      pct: 0,
      vipPct: 10,
    })
  })

  it('rekent geen VIP-korting voor gewone klanten', () => {
    expect(priceFor(base, inMinutes(600), now, true, false, 10).cents).toBe(3200)
  })

  it('rondt in twee stappen af, net als de SQL', () => {
    expect(priceFor(4200, inMinutes(10), now, true).cents).toBe(2520)
    expect(priceFor(8500, inMinutes(45), now, true).cents).toBe(5950)
    expect(priceFor(2800, inMinutes(45), now, true, true, 15).cents).toBe(1666)
  })
})

describe('nextPriceDrop', () => {
  it('kondigt de eerste daling aan', () => {
    expect(nextPriceDrop(base, inMinutes(150), now, true)).toEqual({
      inMs: 30 * 60_000,
      cents: 2560,
      pct: 20,
    })
  })

  it('kondigt de volgende trede aan', () => {
    expect(nextPriceDrop(base, inMinutes(100), now, true)).toEqual({
      inMs: 40 * 60_000,
      cents: 2240,
      pct: 30,
    })
    expect(nextPriceDrop(base, inMinutes(45), now, true)).toEqual({
      inMs: 15 * 60_000,
      cents: 1920,
      pct: 40,
    })
  })

  it('rekent de daling met de korting van een vaste klant', () => {
    expect(nextPriceDrop(base, inMinutes(45), now, true, true, 10)).toEqual({
      inMs: 15 * 60_000,
      cents: 1728,
      pct: 40,
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
