import { useState } from 'react'

import { claimSchema } from '../../domain/schemas'
import type { Slot, Treatment } from '../../domain/types'
import { formatDayLabel, formatTime } from '../../lib/time'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Field } from '../ui/Field'
import { TextInput } from '../ui/TextInput'

/** Vrije plek boeken: we vragen alleen een voornaam. */
export function ClaimDialog({
  slot,
  treatment,
  now,
  busy,
  serverError,
  onConfirm,
  onCancel,
}: {
  slot: Slot | null
  treatment: Treatment | undefined
  now: Date
  busy: boolean
  serverError: string | null
  onConfirm: (firstName: string) => void
  onCancel: () => void
}) {
  const [firstName, setFirstName] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const parsed = claimSchema.safeParse({ firstName })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    setError(null)
    onConfirm(parsed.data.firstName)
  }

  return (
    <Dialog open={slot !== null} onClose={onCancel} labelledBy="boek-kop">
      {slot ? (
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <h2 id="boek-kop" className="text-xl">
            {treatment?.name ?? 'Deze plek'} om{' '}
            <span data-numeric>{formatTime(new Date(slot.starts_at))}</span>,{' '}
            {formatDayLabel(new Date(slot.starts_at), now)}
          </h2>

          <Field id="boek-voornaam" label="Je voornaam" error={error ?? undefined}>
            {(props) => (
              <TextInput
                {...props}
                autoComplete="given-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            )}
          </Field>

          {serverError ? (
            <p role="alert" className="font-bold text-danger">
              {serverError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="primary" loading={busy}>
              Boek deze plek
            </Button>
            <Button variant="quiet" disabled={busy} onClick={onCancel}>
              Annuleren
            </Button>
          </div>
        </form>
      ) : null}
    </Dialog>
  )
}
