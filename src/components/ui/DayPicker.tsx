import { dayName, dayShort } from '../../lib/time'

const DOWS = [1, 2, 3, 4, 5, 6, 7]

/** Dagen waarop je kan: aan/uit per dag, met aria-pressed. */
export function DayPicker({
  value,
  onChange,
  describedBy,
  invalid,
}: {
  value: number[]
  onChange: (days: number[]) => void
  describedBy?: string
  invalid?: boolean
}) {
  function toggle(dow: number) {
    onChange(value.includes(dow) ? value.filter((d) => d !== dow) : [...value, dow].sort())
  }

  return (
    <div
      role="group"
      aria-label="Dagen waarop je kan"
      aria-describedby={describedBy}
      className={[
        'flex flex-wrap gap-2 rounded-block border p-2',
        invalid ? 'border-danger' : 'border-line',
      ].join(' ')}
    >
      {DOWS.map((dow) => {
        const on = value.includes(dow)
        return (
          <button
            key={dow}
            type="button"
            data-veld={dow === 1 ? 'days' : undefined}
            aria-pressed={on}
            onClick={() => toggle(dow)}
            className={[
              'size-11 rounded-full border font-bold transition-colors duration-150',
              on
                ? 'border-blue bg-blue text-white'
                : 'border-line bg-bg text-ink-soft hover:bg-surface',
            ].join(' ')}
          >
            <span aria-hidden="true">{dayShort(dow)}</span>
            <span className="sr-only">{dayName(dow)}</span>
          </button>
        )
      })}
    </div>
  )
}
