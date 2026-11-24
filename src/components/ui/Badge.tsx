import type { LucideIcon } from 'lucide-react'

type Tone = 'neutral' | 'free' | 'offer' | 'blue'

const TONES: Record<Tone, string> = {
  neutral: 'border-line bg-bg text-ink-soft',
  free: 'border-free bg-free-tint text-free-text',
  offer: 'border-offer bg-offer-tint text-offer-text',
  blue: 'border-blue bg-blue-tint text-blue-dark',
}

export function Badge({
  tone = 'neutral',
  icon: Icon,
  children,
}: {
  tone?: Tone
  icon?: LucideIcon
  children: React.ReactNode
}) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold',
        TONES[tone],
      ].join(' ')}
    >
      {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0" /> : null}
      {children}
    </span>
  )
}
