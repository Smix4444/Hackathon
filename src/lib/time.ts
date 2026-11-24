/**
 * Tijdweergave, altijd in Europe/Brussels en in het Nederlands.
 * Puur: `now` komt als parameter binnen, nooit uit Date.now().
 */

const TZ = 'Europe/Brussels'

const DAY_SHORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
const MONTH_SHORT = [
  'jan', 'feb', 'mrt', 'apr', 'mei', 'jun',
  'jul', 'aug', 'sep', 'okt', 'nov', 'dec',
]
const DAY_LONG = [
  'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag',
]

const WEEKDAY_TO_ISO: Record<string, number> = {
  Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
}

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  weekday: 'short',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

interface Parts {
  weekday: string
  year: string
  month: string
  day: string
  hour: string
  minute: string
}

function partsOf(d: Date): Parts {
  const out: Record<string, string> = {}
  for (const part of formatter.formatToParts(d)) {
    if (part.type !== 'literal') out[part.type] = part.value
  }
  return out as unknown as Parts
}

/** "15:45" */
export function formatTime(d: Date): string {
  const p = partsOf(d)
  return `${p.hour}:${p.minute}`
}

/** ISO-weekdag in Brussel: maandag = 1, zondag = 7. */
export function isoDow(d: Date): number {
  return WEEKDAY_TO_ISO[partsOf(d).weekday] ?? 1
}

/** Dagsleutel in Brussel, bv. "2026-11-24". Handig om dagen te vergelijken. */
export function brusselsDayKey(d: Date): string {
  const p = partsOf(d)
  return `${p.year}-${p.month}-${p.day}`
}

function shiftDayKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const shifted = new Date(Date.UTC(y, m - 1, d + days))
  const yy = shifted.getUTCFullYear()
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(shifted.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/** "vandaag" | "morgen" | "do 26 nov" */
export function formatDayLabel(d: Date, now: Date): string {
  const key = brusselsDayKey(d)
  const today = brusselsDayKey(now)
  if (key === today) return 'vandaag'
  if (key === shiftDayKey(today, 1)) return 'morgen'
  const p = partsOf(d)
  return `${DAY_SHORT[isoDow(d) - 1]} ${Number(p.day)} ${MONTH_SHORT[Number(p.month) - 1]}`
}

/** "maandag" — voor de dagkiezer en de wachtkaart. */
export function dayName(dow: number): string {
  return DAY_LONG[dow - 1] ?? ''
}

/** "ma" — korte vorm voor de dagkiezer. */
export function dayShort(dow: number): string {
  return DAY_SHORT[dow - 1] ?? ''
}

/** "1 min 12 s" | "45 s" | "2 min" */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const min = Math.floor(total / 60)
  const sec = total % 60
  if (min === 0) return `${sec} s`
  if (sec === 0) return `${min} min`
  return `${min} min ${sec} s`
}

/** "2 u 15 min" | "45 min" | "0 min" */
export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const hours = Math.floor(total / 60)
  const rest = total % 60
  if (hours === 0) return `${rest} min`
  if (rest === 0) return `${hours} u`
  return `${hours} u ${rest} min`
}

/** "0:42" — altijd m:ss, nooit negatief. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const min = Math.floor(total / 60)
  const sec = total % 60
  return `${min}:${String(sec).padStart(2, '0')}`
}

/** "€ 28,80" */
export function formatEuro(cents: number): string {
  return `€ ${(cents / 100).toFixed(2).replace('.', ',')}`
}

/** "€ 127" — voor grote cijfers in de impactstrook. */
export function formatEuroShort(cents: number): string {
  return `€ ${Math.round(cents / 100)}`
}

/** "09:00" uit een Postgres time-waarde ("09:00:00"). */
export function trimSeconds(time: string): string {
  return time.slice(0, 5)
}

/** Duur van een slot in minuten. */
export function slotMinutes(startsAt: string, endsAt: string): number {
  return Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000)
}

/** Verschil in minuten tussen de Brusselse wandklok en UTC op dat moment. */
function offsetMinutes(d: Date): number {
  const p = partsOf(d)
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute))
  return (asUtc - Math.floor(d.getTime() / 60000) * 60000) / 60000
}

/** Middernacht in Brussel voor een dagsleutel, als echt tijdstip. */
export function brusselsMidnight(dayKey: string): Date {
  const [y, m, d] = dayKey.split('-').map(Number)
  const wall = Date.UTC(y, m - 1, d, 0, 0)
  let guess = new Date(wall)
  for (let i = 0; i < 2; i += 1) {
    guess = new Date(wall - offsetMinutes(guess) * 60000)
  }
  return guess
}

/** Begin van de Brusselse dag `offsetDays` dagen na vandaag. */
export function brusselsDayStart(now: Date, offsetDays: number): Date {
  return brusselsMidnight(shiftDayKey(brusselsDayKey(now), offsetDays))
}
