import { describe, expect, it } from 'vitest'
import {
  brusselsDayKey,
  brusselsDayStart,
  formatCountdown,
  formatDayLabel,
  formatDuration,
  formatEuro,
  formatEuroShort,
  formatMinutes,
  formatTime,
  isoDow,
  slotMinutes,
  trimSeconds,
} from './time'

describe('formatTime', () => {
  it('toont Brusselse tijd', () => {
    // 14:45 UTC in november = 15:45 in Brussel (CET)
    expect(formatTime(new Date('2026-11-24T14:45:00Z'))).toBe('15:45')
    // zomertijd: 13:45 UTC = 15:45 in Brussel (CEST)
    expect(formatTime(new Date('2026-07-24T13:45:00Z'))).toBe('15:45')
  })

  it('toont middernacht als 00:00', () => {
    expect(formatTime(new Date('2026-11-23T23:00:00Z'))).toBe('00:00')
  })
})

describe('isoDow', () => {
  it('geeft maandag 1 en zondag 7', () => {
    expect(isoDow(new Date('2026-11-23T12:00:00Z'))).toBe(1)
    expect(isoDow(new Date('2026-11-29T12:00:00Z'))).toBe(7)
  })
})

describe('brusselsDayKey', () => {
  it('rekent met de Brusselse dag, niet de UTC-dag', () => {
    expect(brusselsDayKey(new Date('2026-11-23T23:30:00Z'))).toBe('2026-11-24')
  })
})

describe('formatDayLabel', () => {
  const now = new Date('2026-11-24T10:00:00Z')

  it('zegt vandaag en morgen', () => {
    expect(formatDayLabel(new Date('2026-11-24T18:00:00Z'), now)).toBe('vandaag')
    expect(formatDayLabel(new Date('2026-11-25T09:00:00Z'), now)).toBe('morgen')
  })

  it('schrijft verdere dagen kort uit', () => {
    expect(formatDayLabel(new Date('2026-11-26T09:00:00Z'), now)).toBe('do 26 nov')
  })

  it('werkt over een maandgrens', () => {
    expect(formatDayLabel(new Date('2026-12-01T09:00:00Z'), new Date('2026-11-30T10:00:00Z'))).toBe(
      'morgen',
    )
  })
})

describe('formatDuration', () => {
  it('toont seconden onder een minuut', () => {
    expect(formatDuration(45_000)).toBe('45 s')
    expect(formatDuration(0)).toBe('0 s')
  })

  it('toont minuten en seconden', () => {
    expect(formatDuration(72_000)).toBe('1 min 12 s')
    expect(formatDuration(120_000)).toBe('2 min')
  })

  it('wordt nooit negatief', () => {
    expect(formatDuration(-5000)).toBe('0 s')
  })
})

describe('formatMinutes', () => {
  it('toont uren en minuten', () => {
    expect(formatMinutes(135)).toBe('2 u 15 min')
    expect(formatMinutes(45)).toBe('45 min')
    expect(formatMinutes(120)).toBe('2 u')
    expect(formatMinutes(0)).toBe('0 min')
  })
})

describe('formatCountdown', () => {
  it('telt af in m:ss', () => {
    expect(formatCountdown(42_000)).toBe('0:42')
    expect(formatCountdown(61_000)).toBe('1:01')
    expect(formatCountdown(-1000)).toBe('0:00')
  })
})

describe('geld', () => {
  it('schrijft euro met komma', () => {
    expect(formatEuro(2880)).toBe('€ 28,80')
    expect(formatEuro(3200)).toBe('€ 32,00')
    expect(formatEuroShort(12700)).toBe('€ 127')
  })
})

describe('slothulpjes', () => {
  it('rekent de slotduur', () => {
    expect(slotMinutes('2026-11-24T15:00:00Z', '2026-11-24T15:45:00Z')).toBe(45)
  })

  it('kort een Postgres-tijd af', () => {
    expect(trimSeconds('09:00:00')).toBe('09:00')
  })
})

describe('brusselsDayStart', () => {
  it('geeft middernacht in Brussel in de winter', () => {
    const start = brusselsDayStart(new Date('2026-11-24T14:00:00Z'), 0)
    expect(start.toISOString()).toBe('2026-11-23T23:00:00.000Z')
    expect(formatTime(start)).toBe('00:00')
  })

  it('geeft middernacht in Brussel in de zomer', () => {
    const start = brusselsDayStart(new Date('2026-07-24T14:00:00Z'), 0)
    expect(start.toISOString()).toBe('2026-07-23T22:00:00.000Z')
    expect(formatTime(start)).toBe('00:00')
  })

  it('schuift naar morgen', () => {
    const start = brusselsDayStart(new Date('2026-11-24T14:00:00Z'), 1)
    expect(brusselsDayKey(start)).toBe('2026-11-25')
    expect(formatTime(start)).toBe('00:00')
  })

  it('werkt op de dag dat de klok verzet wordt', () => {
    const start = brusselsDayStart(new Date('2026-03-29T12:00:00Z'), 0)
    expect(formatTime(start)).toBe('00:00')
    expect(brusselsDayKey(start)).toBe('2026-03-29')
  })
})
