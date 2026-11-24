import { useEffect, useState } from 'react'

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

  // C3: alleen zichtbaar als de server een sleutel heeft.
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiText, setAiText] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiFilled, setAiFilled] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/parse-availability')
      .then((response) => {
        if (alive) setAiEnabled(response.status === 204)
      })
      .catch(() => {
        if (alive) setAiEnabled(false)
      })
    return () => {
      alive = false
    }
  }, [])

  function set<K extends keyof JoinValues>(key: K, value: JoinValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function fillFromText() {
    if (aiText.trim().length === 0) return
    setAiBusy(true)
    setAiError(null)
    try {
      const response = await fetch('/api/parse-availability', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: aiText.slice(0, 200) }),
      })
      if (!response.ok) throw new Error('mislukt')
      const data = (await response.json()) as { days: number[]; from: string; to: string }
      setValues((current) => ({
        ...current,
        days: [...data.days].sort((a, b) => a - b),
        timeFrom: data.from,
        timeTo: data.to,
      }))
      setAiFilled(true)
      window.setTimeout(() => setAiFilled(false), 2500)
    } catch {
      setAiError('Dat lukte niet. Vul je dagen en uren hieronder zelf in.')
    } finally {
      setAiBusy(false)
    }
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

      {aiEnabled ? (
        <div className="flex flex-col gap-2 rounded-block border border-line bg-surface p-4">
          <Field
            id="wanneer"
            label="Typ wanneer je kan"
            hint="Bijvoorbeeld: dinsdag of donderdag na vijf."
            error={aiError ?? undefined}
          >
            {(props) => (
              <div className="flex flex-wrap items-center gap-2">
                <TextInput
                  {...props}
                  value={aiText}
                  maxLength={200}
                  onChange={(event) => setAiText(event.target.value)}
                  className="min-w-0 flex-1"
                />
                <Button
                  variant="secondary"
                  loading={aiBusy}
                  disabled={aiText.trim().length === 0 || aiBusy}
                  onClick={fillFromText}
                >
                  Vul in
                </Button>
              </div>
            )}
          </Field>
          <p aria-live="polite" className="text-sm text-ink-soft">
            {aiFilled ? 'Ingevuld hieronder. Controleer het even.' : null}
          </p>
        </div>
      ) : null}

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
