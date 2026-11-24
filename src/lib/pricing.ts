/**
 * Last-minute prijs. MOET overeenkomen met de SQL-functie public.price_for:
 * < 30 min voor de start -30 %, < 60 min -20 %, < 180 min -10 %.
 */

export const DISCOUNT_TIERS = [
  { underMinutes: 30, pct: 30 },
  { underMinutes: 60, pct: 20 },
  { underMinutes: 180, pct: 10 },
] as const

const MS_PER_MIN = 60_000

function discountPct(minutesUntilStart: number): number {
  for (const tier of DISCOUNT_TIERS) {
    if (minutesUntilStart < tier.underMinutes) return tier.pct
  }
  return 0
}

function applyPct(baseCents: number, pct: number): number {
  if (pct === 0) return baseCents
  return Math.round(baseCents * ((100 - pct) / 100))
}

export function priceFor(
  baseCents: number,
  startsAt: Date,
  now: Date,
  discountOn: boolean,
): { cents: number; pct: number } {
  if (!discountOn) return { cents: baseCents, pct: 0 }
  const minutes = (startsAt.getTime() - now.getTime()) / MS_PER_MIN
  const pct = discountPct(minutes)
  return { cents: applyPct(baseCents, pct), pct }
}

/**
 * Wanneer zakt de prijs opnieuw, en naar welk bedrag?
 * Null als er geen daling meer komt (korting uit, of al in de laagste trede).
 */
export function nextPriceDrop(
  baseCents: number,
  startsAt: Date,
  now: Date,
  discountOn: boolean,
): { inMs: number; cents: number; pct: number } | null {
  if (!discountOn) return null
  const minutes = (startsAt.getTime() - now.getTime()) / MS_PER_MIN
  if (minutes <= 0) return null

  // Hoogste drempel die we nog moeten passeren.
  const next = [...DISCOUNT_TIERS]
    .sort((a, b) => b.underMinutes - a.underMinutes)
    .find((tier) => minutes >= tier.underMinutes)

  if (!next) return null
  return {
    inMs: Math.max(0, (minutes - next.underMinutes) * MS_PER_MIN),
    cents: applyPct(baseCents, next.pct),
    pct: next.pct,
  }
}
