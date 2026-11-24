import { Button } from '../ui/Button'

/** S8: demo op één toestel. Alleen zichtbaar bij demo-klanten. */
export function SimulateButtons({
  name,
  busy,
  onRespond,
}: {
  name: string
  busy: boolean
  onRespond: (accept: boolean) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-sm text-ink-soft">Demo:</p>
      <Button variant="primary" loading={busy} onClick={() => onRespond(true)}>
        {name} accepteert
      </Button>
      <Button variant="secondary" disabled={busy} onClick={() => onRespond(false)}>
        {name} weigert
      </Button>
    </div>
  )
}
