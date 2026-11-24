import type { Slot } from '../../domain/types'
import { formatTime } from '../../lib/time'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

export function ReleaseDialog({
  slot,
  busy,
  onConfirm,
  onCancel,
}: {
  slot: Slot | null
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Dialog
      open={slot !== null}
      onClose={onCancel}
      labelledBy="vrijgeven-kop"
      describedBy="vrijgeven-uitleg"
    >
      {slot ? (
        <div className="flex flex-col gap-5">
          <h2 id="vrijgeven-kop" className="text-xl">
            {slot.customer_name ?? 'Deze klant'} komt niet om{' '}
            <span data-numeric>{formatTime(new Date(slot.starts_at))}</span>?
          </h2>
          <p id="vrijgeven-uitleg" className="text-ink-soft">
            We bieden de plek meteen aan de best passende klant op je wachtlijst aan.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" loading={busy} onClick={onConfirm}>
              Plek vrijgeven
            </Button>
            <Button variant="quiet" disabled={busy} onClick={onCancel}>
              Annuleren
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  )
}
