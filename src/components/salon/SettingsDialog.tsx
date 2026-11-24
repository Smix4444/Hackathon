import { useState } from 'react'
import { toast } from 'sonner'

import { OFFER_SECONDS_OPTIONS, settingsSchema } from '../../domain/schemas'
import type { Salon } from '../../domain/types'
import { messageForError } from '../../lib/errors'
import { resetDemo, updateSettings } from '../../services/salonService'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Field } from '../ui/Field'
import { Select } from '../ui/Select'
import { TextInput } from '../ui/TextInput'

const SECONDS_LABEL: Record<number, string> = {
  30: '30 seconden',
  60: '1 minuut',
  120: '2 minuten',
  300: '5 minuten',
}

/** S7: aanbodtijd, korting, gemiddelde wachttijd en demo resetten. */
export function SettingsDialog({
  salon,
  open,
  onClose,
  onSaved,
}: {
  salon: Salon
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [offerSeconds, setOfferSeconds] = useState(salon.offer_seconds)
  const [discount, setDiscount] = useState(salon.last_minute_discount)
  const [waitDays, setWaitDays] = useState(String(salon.typical_wait_days))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  async function save() {
    const parsed = settingsSchema.safeParse({
      offerSeconds,
      lastMinuteDiscount: discount,
      typicalWaitDays: Number(waitDays),
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await updateSettings(salon.slug, parsed.data)
      toast.success('Instellingen bewaard')
      onSaved()
      onClose()
    } catch (caught) {
      setError(messageForError(caught))
    } finally {
      setBusy(false)
    }
  }

  async function reset() {
    setBusy(true)
    try {
      await resetDemo(salon.slug)
      toast.success('Demo opnieuw opgezet')
      setConfirmReset(false)
      onSaved()
      onClose()
    } catch (caught) {
      setError(messageForError(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} labelledBy="instellingen-kop">
      <div className="flex flex-col gap-6">
        <h2 id="instellingen-kop" className="text-xl">
          Instellingen
        </h2>

        <Field id="aanbodtijd" label="Hoe lang krijgt een klant om te beslissen?">
          {(props) => (
            <Select
              {...props}
              value={offerSeconds}
              onChange={(event) => setOfferSeconds(Number(event.target.value))}
            >
              {OFFER_SECONDS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {SECONDS_LABEL[value]}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={discount}
            onChange={(event) => setDiscount(event.target.checked)}
            className="mt-1 size-5 accent-[var(--color-blue)]"
          />
          <span>
            <span className="font-bold">Last-minute korting</span>
            <span className="block text-sm text-ink-soft">
              Hoe dichter bij het tijdstip, hoe goedkoper een vrije plek.
            </span>
          </span>
        </label>

        <Field
          id="wachttijd"
          label="Hoe lang wacht een klant normaal op een afspraak?"
          hint="In dagen. Hiermee rekenen we uit hoeveel sneller iemand geholpen is."
        >
          {(props) => (
            <TextInput
              {...props}
              type="number"
              min={1}
              max={90}
              value={waitDays}
              data-numeric
              onChange={(event) => setWaitDays(event.target.value)}
              className="w-28"
            />
          )}
        </Field>

        {error ? (
          <p role="alert" className="font-bold text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button variant="primary" loading={busy} onClick={save}>
            Bewaren
          </Button>
          <Button variant="quiet" disabled={busy} onClick={onClose}>
            Sluiten
          </Button>
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-5">
          <h3 className="text-base">Demo</h3>
          {confirmReset ? (
            <>
              <p className="text-ink-soft">
                De agenda, wachtlijst en activiteit van deze salon worden opnieuw opgezet vanaf het
                volgende uur. Je eigen inschrijvingen verdwijnen.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="danger" loading={busy} onClick={reset}>
                  Ja, demo resetten
                </Button>
                <Button variant="quiet" disabled={busy} onClick={() => setConfirmReset(false)}>
                  Laat maar
                </Button>
              </div>
            </>
          ) : (
            <div>
              <Button variant="secondary" onClick={() => setConfirmReset(true)}>
                Demo resetten
              </Button>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  )
}
