import type { ReactNode } from 'react'

export interface FieldChildProps {
  id: string
  'aria-describedby': string | undefined
  'aria-invalid': true | undefined
}

/**
 * Label, hint en foutboodschap rond een invoerveld. De render-prop geeft
 * de juiste aria-attributen mee, zodat ze nooit vergeten worden.
 */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  children: (props: FieldChildProps) => ReactNode
}) {
  const hintId = hint ? `${id}-hint` : null
  const errorId = error ? `${id}-error` : null
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      {hint ? (
        <p id={hintId as string} className="text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error ? (
        <p id={errorId as string} className="text-sm font-bold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
