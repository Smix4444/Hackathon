import type { MyEntry } from '../domain/types'

/**
 * Veilige localStorage-wrapper. In een privevenster of met opslag
 * uitgeschakeld gooit localStorage; de app mag daar niet op stuklopen.
 */

const ROLE_KEY = 'replannr.role'
const ENTRIES_KEY = 'replannr.entries'

export type Role = 'customer' | 'salon'

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeRaw(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Opslag niet beschikbaar: de app werkt verder, alleen zonder herkenning.
  }
}

export function getRole(): Role | null {
  const value = readRaw(ROLE_KEY)
  return value === 'customer' || value === 'salon' ? value : null
}

export function setRole(role: Role): void {
  writeRaw(ROLE_KEY, role)
}

export function getMyEntries(): MyEntry[] {
  const raw = readRaw(ENTRIES_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is MyEntry =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as MyEntry).entryId === 'string' &&
        typeof (item as MyEntry).token === 'string' &&
        typeof (item as MyEntry).salonSlug === 'string',
    )
  } catch {
    return []
  }
}

function saveEntries(entries: MyEntry[]): void {
  writeRaw(ENTRIES_KEY, JSON.stringify(entries))
}

export function addMyEntry(entry: MyEntry): void {
  const next = [...getMyEntries().filter((e) => e.entryId !== entry.entryId), entry]
  saveEntries(next)
}

export function removeMyEntry(entryId: string): void {
  saveEntries(getMyEntries().filter((e) => e.entryId !== entryId))
}

export function entriesForSalon(slug: string): MyEntry[] {
  return getMyEntries().filter((e) => e.salonSlug === slug)
}

/** Nieuw apparaat-token. Alleen de hash gaat naar de database. */
export function newToken(): string {
  return crypto.randomUUID()
}
