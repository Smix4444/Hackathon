import { useRef } from 'react'

export interface Segment<T extends string> {
  value: T
  label: string
}

/**
 * Tabs met pijltjestoetsen. Gebruikt voor Vandaag / Morgen.
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  segments,
  onChange,
}: {
  label: string
  value: T
  segments: Segment<T>[]
  onChange: (value: T) => void
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  function onKeyDown(event: React.KeyboardEvent) {
    const index = segments.findIndex((segment) => segment.value === value)
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % segments.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + segments.length) % segments.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = segments.length - 1
    else return

    event.preventDefault()
    const target = segments[next]
    onChange(target.value)
    refs.current[target.value]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="inline-flex gap-1 rounded-full border border-line bg-surface p-1"
    >
      {segments.map((segment) => {
        const selected = segment.value === value
        return (
          <button
            key={segment.value}
            ref={(node) => {
              refs.current[segment.value] = node
            }}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(segment.value)}
            className={[
              'min-h-11 rounded-full px-5 font-bold transition-colors duration-150',
              selected ? 'bg-blue text-white' : 'text-ink-soft hover:bg-blue-tint hover:text-blue-dark',
            ].join(' ')}
          >
            {segment.label}
          </button>
        )
      })}
    </div>
  )
}
