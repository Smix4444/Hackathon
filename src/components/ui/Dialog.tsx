import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  labelledBy: string
  describedBy?: string
  /** alertdialog voor een aanbod dat aandacht vraagt. */
  role?: 'dialog' | 'alertdialog'
  /** Esc sluit de dialoog. Uit bij het aanbod: niets doen is geen weigeren. */
  dismissable?: boolean
  children: ReactNode
}

/**
 * Native dialog: focus-trap, Esc en backdrop krijgen we van de browser.
 * De focus gaat bij sluiten terug naar het element dat de dialoog opende.
 */
export function Dialog({
  open,
  onClose,
  labelledBy,
  describedBy,
  role = 'dialog',
  dismissable = true,
  children,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef<Element | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    if (open && !node.open) {
      opener.current = document.activeElement
      node.showModal()
    }
    if (!open && node.open) {
      node.close()
      if (opener.current instanceof HTMLElement) opener.current.focus()
    }
  }, [open])

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const onCancel = (event: Event) => {
      event.preventDefault()
      if (dismissable) onClose()
    }
    node.addEventListener('cancel', onCancel)
    return () => node.removeEventListener('cancel', onCancel)
  }, [dismissable, onClose])

  return (
    <dialog
      ref={ref}
      role={role}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-modal="true"
      className="w-[min(32rem,calc(100vw-2rem))] rounded-dialog border border-line bg-bg p-6 text-ink shadow-[0_24px_60px_rgba(14,27,61,0.18)] backdrop:bg-ink/45 open:animate-rise sm:p-8"
    >
      {children}
    </dialog>
  )
}
