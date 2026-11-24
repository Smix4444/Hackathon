import { describe, expect, it } from 'vitest'
import { codeOfError, messageForError } from './errors'

describe('messageForError', () => {
  it('herkent onze eigen foutcodes', () => {
    expect(messageForError({ message: 'SLOT_TAKEN' })).toBe(
      'Iemand anders was je net voor. Je blijft op de wachtlijst.',
    )
    expect(messageForError({ message: 'P0001: OFFER_EXPIRED' })).toBe(
      'De tijd is om. De plek ging naar de volgende in de rij.',
    )
    expect(messageForError({ message: 'NOT_YOUR_OFFER' })).toBe(
      'Dit aanbod hoort bij een ander toestel.',
    )
  })

  it('herkent een check-constraint', () => {
    expect(messageForError({ code: '23514', message: 'violates check constraint' })).toBe(
      'Een van de velden klopt niet. Controleer je invoer.',
    )
  })

  it('herkent een netwerkfout', () => {
    expect(messageForError(new TypeError('Failed to fetch'))).toBe(
      'Geen verbinding. Controleer je internet en probeer opnieuw.',
    )
  })

  it('valt terug op een algemene boodschap', () => {
    expect(messageForError({ message: 'iets onverwachts' })).toBe(
      'Er ging iets mis. Probeer opnieuw.',
    )
    expect(messageForError(null)).toBe('Er ging iets mis. Probeer opnieuw.')
  })
})

describe('codeOfError', () => {
  it('geeft de code terug of null', () => {
    expect(codeOfError({ message: 'OFFER_EXPIRED' })).toBe('OFFER_EXPIRED')
    expect(codeOfError({ message: 'niets bijzonders' })).toBeNull()
  })
})
