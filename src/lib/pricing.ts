/**
 * Last-minute prijs. MOET overeenkomen met de SQL-functies public.price_for
 * en public.price_for_entry: binnen 2 uur -20 %, binnen 1 uur -30 %,
 * binnen 30 minuten -40 %. Vaste klanten krijgen daar hun korting bovenop.
 */

export const DISCOUNT_TIERS = [
  { underMinutes: 30, pct: 40 },
  { underMinutes: 60, pct: 30 },
  { underMinutes: 120, pct: 20 },
] as const

const MS_PER_MIN = 60_000

export interface Price {
  /** Wat deze persoon betaalt. */
  cents: number
  /** Last-minute korting in procent. */
  pct: number
  /** Extra korting omdat het een vaste klant is, 0 als dat niet zo is. */
  vipPct: number
}

function discountPct(minutesUntilStart: number): number {
  for (const tier of DISCOUNT_TIERS) {
    if (minutesUntilStart < tier.underMinutes) return tier.pct
  }
  return 0
}

function applyPct(cents: number, pct: number): number {
  if (pct === 0) return cents
  return Math.round((cents * (100 - pct)) / 100)
}

export function priceFor(
  baseCents: number,
  startsAt: Date,
  now: Date,
  discountOn: boolean,
  isVip = false,
  vipPct = 0,
): Price {
  const minutes = (startsAt.getTime() - now.getTime()) / MS_PER_MIN
  const pct = discountOn ? discountPct(minutes) : 0
  const lastMinute = applyPct(baseCents, pct)
  const vip = isVip ? vipPct : 0
  return { cents: applyPct(lastMinute, vip), pct, vipPct: vip }
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
  isVip = false,
  vipPct = 0,
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
    cents: applyPct(applyPct(baseCents, next.pct), isVip ? vipPct : 0),
    pct: next.pct,
  }
}
