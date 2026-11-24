import { CircleDashed, Hourglass } from 'lucide-react'
import { useState } from 'react'

import type { Treatment, WaitlistEntry } from '../../domain/types'
import { ordinalNl, waitlistPosition } from '../../lib/queue'
import { dayName, trimSeconds } from '../../lib/time'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

function daysSentence(days: number[]): string {
  const names = days.map((day) => dayName(day))
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} en ${names[names.length - 1]}`
}

/** Je staat op de wachtlijst: positie, venster en wat er nu gebeurt. */
export function WaitingCard({
  entry,
  allEntries,
  treatment,
  busy,
  onLeave,
}: {
  entry: WaitlistEntry
  allEntries: WaitlistEntry[]
  treatment: Treatment | undefined
  busy: boolean
  onLeave: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  const position = waitlistPosition(allEntries, entry.id)
  const hasOffer = entry.status === 'offered'

  return (
    <section aria-labelledby="wacht-kop" className="flex flex-col gap-5">
      <h2 id="wacht-kop" className="text-2xl">
        Je staat op de wachtlijst voor {treatment?.name?.toLowerCase() ?? 'je behandeling'}
      </h2>

      <div className="flex flex-col gap-3 rounded-block border border-line bg-surface p-5">
        <p className="flex items-center gap-2 font-bold">
          {hasOffer ? (
            <Hourglass aria-hidden="true" className="size-5 shrink-0 text-offer-text" />
          ) : (
            <CircleDashed aria-hidden="true" className="size-5 shrink-0 text-blue" />
          )}
          {hasOffer
            ? 'Je hebt nu een aanbod openstaan'
            : position === null
              ? 'Je plek in de rij wordt bijgewerkt'
              : `Je bent ${ordinalNl(position)} in de rij`}
        </p>
        <p className="text-ink-soft">
          Je kan op {daysSentence(entry.days)}, tussen{' '}
          <span data-numeric>{trimSeconds(entry.time_from)}</span> en{' '}
          <span data-numeric>{trimSeconds(entry.time_to)}</span>, en je bent er binnen{' '}
          <span data-numeric>{entry.lead_minutes}</span> minuten.
        </p>
      </div>

      <p className="text-ink-soft">
        Houd deze pagina open. Komt er een plek vrij die past, dan verschijnt ze hier.
      </p>

      <div>
        <Button variant="quiet" onClick={() => setConfirm(true)}>
          Van de wachtlijst gaan
        </Button>
      </div>

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        labelledBy="weg-kop"
        describedBy="weg-uitleg"
      >
        <div className="flex flex-col gap-5">
          <h2 id="weg-kop" className="text-xl">
            Van de wachtlijst gaan?
          </h2>
          <p id="weg-uitleg" className="text-ink-soft">
            Je krijgt dan geen aanbod meer als er een plek vrijkomt. Je kan je altijd opnieuw
            inschrijven.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="danger" loading={busy} onClick={onLeave}>
              Ja, haal me van de lijst
            </Button>
            <Button variant="quiet" disabled={busy} onClick={() => setConfirm(false)}>
              Laat maar
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  )
}
