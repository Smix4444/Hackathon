import { CircleAlert } from 'lucide-react'

import { messageForError } from '../../lib/errors'
import { Button } from './Button'

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-block border border-danger bg-danger-tint px-5 py-5"
    >
      <p className="flex items-start gap-2 font-bold text-danger">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        {messageForError(error)}
      </p>
      {onRetry ? (
        <Button onClick={onRetry} variant="secondary">
          Opnieuw proberen
        </Button>
      ) : null}
    </div>
  )
}
