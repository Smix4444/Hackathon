import { describe, expect, it } from 'vitest'
import { buildIcs } from './ics'

describe('buildIcs', () => {
  const ics = buildIcs({
    uid: 'slot-1@invaller',
    title: 'Knippen bij Studio Noor',
    start: new Date('2026-11-24T14:45:00Z'),
    end: new Date('2026-11-24T15:15:00Z'),
    location: 'Studio Noor, Antwerpen',
    description: 'Je plek via Invaller',
  })

  it('bouwt een geldig VEVENT', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true)
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
    expect(ics).toContain('UID:slot-1@invaller')
    expect(ics).toContain('DTSTART:20261124T144500Z')
    expect(ics).toContain('DTEND:20261124T151500Z')
  })

  it('gebruikt CRLF-regeleindes', () => {
    expect(ics.includes('BEGIN:VCALENDAR\r\nVERSION:2.0')).toBe(true)
  })

  it('ontsnapt komma en puntkomma in tekst', () => {
    expect(ics).toContain('LOCATION:Studio Noor')
    const location = ics.split('\r\n').find((line) => line.startsWith('LOCATION:'))
    expect(location).toBe('LOCATION:Studio Noor' + String.fromCharCode(92) + ', Antwerpen')
  })
})
