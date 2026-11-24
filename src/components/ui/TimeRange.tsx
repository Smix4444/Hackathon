import { Select } from './Select'

function options(): string[] {
  const out: string[] = []
  for (let minutes = 7 * 60; minutes <= 22 * 60; minutes += 30) {
    const h = String(Math.floor(minutes / 60)).padStart(2, '0')
    const m = String(minutes % 60).padStart(2, '0')
    out.push(`${h}:${m}`)
  }
  return out
}

const TIMES = options()

/** Van / tot, in stappen van 30 minuten. */
export function TimeRange({
  from,
  to,
  onFrom,
  onTo,
  invalid,
  describedBy,
}: {
  from: string
  to: string
  onFrom: (value: string) => void
  onTo: (value: string) => void
  invalid?: boolean
  describedBy?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-2">
        <span className="text-sm text-ink-soft">Van</span>
        <Select
          value={from}
          onChange={(event) => onFrom(event.target.value)}
          aria-describedby={describedBy}
          data-numeric
        >
          {TIMES.map((time) => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex items-center gap-2">
        <span className="text-sm text-ink-soft">tot</span>
        <Select
          value={to}
          data-veld="timeTo"
          onChange={(event) => onTo(event.target.value)}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
          data-numeric
        >
          {TIMES.map((time) => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </Select>
      </label>
    </div>
  )
}
