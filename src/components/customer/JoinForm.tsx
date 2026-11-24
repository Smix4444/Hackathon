import { useState } from 'react'

import { LEAD_OPTIONS, joinSchema } from '../../domain/schemas'
import type { Treatment } from '../../domain/types'
import { isoDow } from '../../lib/time'
import { Button } from '../ui/Button'
import { DayPicker } from '../ui/DayPicker'
import { Field } from '../ui/Field'
import { Select } from '../ui/Select'
import { TextInput } from '../ui/TextInput'
import { TimeRange } from '../ui/TimeRange'

const LEAD_LABEL: Record<number, string> = {
  15: 'binnen een kwartier',
  30: 'binnen een halfuur',
  60: 'binnen een uur',
  120: 'binnen twee uur',
}

export interface JoinValues {
  firstName: string
  treatmentId: string
  days: number[]
  timeFrom: string
  timeTo: string
  leadMinutes: number
}

type Errors = Partial<Record<keyof JoinValues, string>>

/** Inschrijven op de wachtlijst. Geen account, alleen deze vijf dingen. */
export function JoinForm({
  treatments,
  busy,
  serverError,
  onSubmit,
}: {
  treatments: Treatment[]
  busy: boolean
  serverError: string | null
  onSubmit: (values: JoinValues) => void
}) {
  const today = isoDow(new Date())
  const tomorrow = (today % 7) + 1

  const [values, setValues] = useState<JoinValues>({
    firstName: '',
    treatmentId: treatments[0]?.id ?? '',
    days: [today, tomorrow].sort((a, b) => a - b),
    timeFrom: '09:00',
    timeTo: '21:00',
    leadMinutes: 30,
  })
  const [errors, setErrors] = useState<Errors>({})

  function set<K extends keyof JoinValues>(key: K, value: JoinValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const parsed = joinSchema.safeParse(values)
    if (!parsed.success) {
      const next: Errors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof JoinValues | undefined
        if (key && !next[key]) next[key] = issue.message
      }
      setErrors(next)

      const order: (keyof JoinValues)[] = [
        'firstName',
        'treatmentId',
        'days',
        'timeFrom',
        'timeTo',
        'leadMinutes',
      ]
      const first = order.find((key) => next[key])
      if (first) {
        const node = document.querySelector<HTMLElement>(`[data-veld="${first}"]`)
        node?.focus()
      }
      return
    }

    setErrors({})
    onSubmit(parsed.data)
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <Field id="voornaam" label="Je voornaam" error={errors.firstName}>
        {(props) => (
          <TextInput
            {...props}
            data-veld="firstName"
            autoComplete="given-name"
            value={values.firstName}
            onChange={(event) => set('firstName', event.target.value)}
          />
        )}
      </Field>

      <Field id="behandeling" label="Wat wil je laten doen?" error={errors.treatmentId}>
        {(props) => (
          <Select
            {...props}
            data-veld="treatmentId"
            value={values.treatmentId}
            onChange={(event) => set('treatmentId', event.target.value)}
          >
            {treatments.map((treatment) => (
              <option key={treatment.id} value={treatment.id}>
                {treatment.name}, {treatment.duration_min} min
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field
        id="dagen"
        label="Op welke dagen kan je?"
        hint="Kies er zoveel je wil. Hoe meer dagen, hoe sneller je een plek krijgt."
        error={errors.days}
      >
        {(props) => (
          <DayPicker
            value={values.days}
            onChange={(days) => set('days', days)}
            describedBy={props['aria-describedby']}
            invalid={Boolean(errors.days)}
          />
        )}
      </Field>

      <Field id="venster" label="Tussen welke uren kan je?" error={errors.timeTo}>
        {(props) => (
          <TimeRange
            from={values.timeFrom}
            to={values.timeTo}
            onFrom={(value) => set('timeFrom', value)}
            onTo={(value) => set('timeTo', value)}
            describedBy={props['aria-describedby']}
            invalid={Boolean(errors.timeTo)}
          />
        )}
      </Field>

      <Field
        id="aankomst"
        label="Hoe snel kan je er zijn?"
        hint="Zo bieden we je alleen plekken aan die je echt kan halen."
        error={errors.leadMinutes}
      >
        {(props) => (
          <Select
            {...props}
            data-veld="leadMinutes"
            value={values.leadMinutes}
            onChange={(event) => set('leadMinutes', Number(event.target.value))}
          >
            {LEAD_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {LEAD_LABEL[minutes]}
              </option>
            ))}
          </Select>
        )}
      </Field>

      {serverError ? (
        <p role="alert" className="font-bold text-danger">
          {serverError}
        </p>
      ) : null}

      <div>
        <Button type="submit" variant="primary" size="lg" block loading={busy}>
          Zet me op de wachtlijst
        </Button>
      </div>
    </form>
  )
}
