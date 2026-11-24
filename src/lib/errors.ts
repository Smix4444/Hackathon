/** Databasefoutcodes naar Nederlandse boodschappen (PLAN sectie 6). */

const BY_CODE: Record<string, string> = {
  SLOT_TAKEN: 'Iemand anders was je net voor. Je blijft op de wachtlijst.',
  OFFER_EXPIRED: 'De tijd is om. De plek ging naar de volgende in de rij.',
  OFFER_CLOSED: 'Dit aanbod is niet meer geldig.',
  OFFER_NOT_FOUND: 'Dit aanbod bestaat niet meer.',
  NOT_YOUR_OFFER: 'Dit aanbod hoort bij een ander toestel.',
  NOT_YOUR_ENTRY: 'Deze inschrijving hoort bij een ander toestel.',
  NOT_DEMO_ENTRY: 'Dit kan alleen voor demo-klanten.',
  SLOT_NOT_BOOKED: 'Deze afspraak is al vrijgegeven.',
  SLOT_IN_PAST: 'Deze afspraak is al begonnen.',
  SLOT_NOT_FOUND: 'Deze afspraak bestaat niet meer.',
  ENTRY_BUSY: 'Je hebt nu een aanbod openstaan. Beantwoord dat eerst.',
  SALON_NOT_FOUND: 'Deze salon bestaat niet. Controleer de link.',
  NO_BOOKING: 'We vinden geen afspraak om af te zeggen.',
  TREATMENT_NOT_FOUND: 'Deze behandeling bestaat niet meer. Kies een andere.',
}

const NETWORK = 'Geen verbinding. Controleer je internet en probeer opnieuw.'
const FALLBACK = 'Er ging iets mis. Probeer opnieuw.'
const CHECK = 'Een van de velden klopt niet. Controleer je invoer.'

export const NOT_CONFIGURED =
  'De app is nog niet aan een database gekoppeld. Vul VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in.'

function textOf(err: unknown): string {
  if (typeof err === 'string') return err
  if (err && typeof err === 'object') {
    const e = err as { message?: unknown; details?: unknown; code?: unknown }
    return [e.message, e.details, e.code].filter((v) => typeof v === 'string').join(' ')
  }
  return ''
}

/** Herkent onze eigen raise-codes, Postgres-checks en netwerkfouten. */
export function messageForError(err: unknown): string {
  const text = textOf(err)

  for (const [code, message] of Object.entries(BY_CODE)) {
    if (text.includes(code)) return message
  }

  if (text.includes('23514')) return CHECK
  if (text.includes('ontbrekende-sleutel') || text.includes('Invalid API key')) {
    return NOT_CONFIGURED
  }
  if (
    err instanceof TypeError ||
    /failed to fetch|networkerror|network request failed|fetch failed/i.test(text)
  ) {
    return NETWORK
  }
  return FALLBACK
}

/** Code zelf, als we erop willen reageren (bv. aanbod verlopen). */
export function codeOfError(err: unknown): string | null {
  const text = textOf(err)
  for (const code of Object.keys(BY_CODE)) {
    if (text.includes(code)) return code
  }
  return null
}
