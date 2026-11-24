import { describe, expect, it } from 'vitest'
import { claimSchema, joinSchema, settingsSchema } from './schemas'

const valid = {
  firstName: 'Sarah',
  treatmentId: '11111111-1111-4111-8111-111111111111',
  days: [1, 2],
  timeFrom: '09:00',
  timeTo: '21:00',
  leadMinutes: 30,
}

function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message
}

describe('joinSchema', () => {
  it('laat geldige invoer door', () => {
    expect(joinSchema.safeParse(valid).success).toBe(true)
  })

  it('aanvaardt namen met accenten, streepje en apostrof', () => {
    for (const name of ['Inès', 'Jean-Luc', "O'Hara"]) {
      expect(joinSchema.safeParse({ ...valid, firstName: name }).success).toBe(true)
    }
  })

  it('weigert te korte namen en cijfers', () => {
    expect(firstMessage(joinSchema.safeParse({ ...valid, firstName: 'A' }))).toBe(
      'Vul je voornaam in (2 tot 30 letters).',
    )
    expect(joinSchema.safeParse({ ...valid, firstName: 'Sarah2' }).success).toBe(false)
  })

  it('vraagt minstens één dag', () => {
    expect(firstMessage(joinSchema.safeParse({ ...valid, days: [] }))).toBe('Kies minstens één dag.')
  })

  it('vraagt een behandeling', () => {
    expect(firstMessage(joinSchema.safeParse({ ...valid, treatmentId: '' }))).toBe(
      'Kies een behandeling.',
    )
  })

  it('vraagt een venster van minstens 30 minuten', () => {
    expect(firstMessage(joinSchema.safeParse({ ...valid, timeFrom: '09:00', timeTo: '09:20' }))).toBe(
      'Je venster moet minstens 30 minuten zijn.',
    )
    expect(joinSchema.safeParse({ ...valid, timeFrom: '09:00', timeTo: '09:30' }).success).toBe(true)
  })

  it('weigert een onbekende aankomsttijd', () => {
    expect(joinSchema.safeParse({ ...valid, leadMinutes: 45 }).success).toBe(false)
  })
})

describe('claimSchema', () => {
  it('vraagt alleen een voornaam', () => {
    expect(claimSchema.safeParse({ firstName: 'Bilal' }).success).toBe(true)
    expect(claimSchema.safeParse({ firstName: '' }).success).toBe(false)
  })
})

describe('settingsSchema', () => {
  it('laat geldige instellingen door', () => {
    expect(
      settingsSchema.safeParse({ offerSeconds: 60, lastMinuteDiscount: true, typicalWaitDays: 14 })
        .success,
    ).toBe(true)
  })

  it('weigert een aanbodtijd buiten de lijst en een rare wachttijd', () => {
    expect(
      settingsSchema.safeParse({ offerSeconds: 45, lastMinuteDiscount: true, typicalWaitDays: 14 })
        .success,
    ).toBe(false)
    expect(
      settingsSchema.safeParse({ offerSeconds: 60, lastMinuteDiscount: true, typicalWaitDays: 0 })
        .success,
    ).toBe(false)
  })
})
