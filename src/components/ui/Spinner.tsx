import { LoaderCircle } from 'lucide-react'

export function Spinner({ label = 'Bezig' }: { label?: string }) {
  return (
    <>
      <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
      <span className="sr-only">{label}</span>
    </>
  )
}
