import { CalendarCheck, Check, CircleDashed, Hourglass } from 'lucide-react'
import { useEffect, useState } from 'react'

type Phase = 'free' | 'offered' | 'filled'

const FREE_MS = 2400
const OFFER_MS = 3200

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function Row({
  time,
  children,
  className = '',
}: {
  time: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <li className="flex gap-3">
      <p data-numeric className="w-12 shrink-0 pt-4 font-display text-base font-extrabold">
        {time}
      </p>
      <div className={['flex-1 rounded-block border p-4 transition-colors duration-300', className].join(' ')}>
        {children}
      </div>
    </li>
  )
}

/**
 * De enige animatie op de landingspagina: één afspraak gaat één keer van
 * koraal (vrij) naar zonnegeel (aangeboden) naar blauw (ingevuld).
 */
export function MiniAgenda() {
  const reduced = prefersReducedMotion()
  const [phase, setPhase] = useState<Phase>(reduced ? 'filled' : 'free')
  const [drain, setDrain] = useState(1)

  useEffect(() => {
    if (reduced) return
    const toOffered = setTimeout(() => {
      setPhase('offered')
      requestAnimationFrame(() => setDrain(0))
    }, FREE_MS)
    const toFilled = setTimeout(() => setPhase('filled'), FREE_MS + OFFER_MS)
    return () => {
      clearTimeout(toOffered)
      clearTimeout(toFilled)
    }
  }, [reduced])

  return (
    <div className="rounded-dialog border border-line bg-surface p-5">
      <p className="mb-4 font-bold text-ink-soft">Vandaag bij Studio Noor</p>

      <ol className="flex flex-col gap-2">
        <Row time="15:00" className="border-line bg-bg">
          <p className="font-bold">Tom</p>
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <CalendarCheck aria-hidden="true" className="size-4 shrink-0" />
            Knippen
          </p>
        </Row>

        {phase === 'free' ? (
          <Row time="15:45" className="stripes-free border-free animate-soft-pulse">
            <p className="font-bold text-free-text">Vrije plek</p>
            <p className="flex items-center gap-2 text-sm text-free-text">
              <CircleDashed aria-hidden="true" className="size-4 shrink-0" />
              Tom heeft net afgezegd
            </p>
          </Row>
        ) : null}

        {phase === 'offered' ? (
          <Row time="15:45" className="border-offer bg-offer-tint">
            <p className="font-bold">Aangeboden aan Sarah</p>
            <p className="flex items-center gap-2 text-sm text-ink-soft">
              <Hourglass aria-hidden="true" className="size-4 shrink-0" />
              Zij beslist nu
            </p>
            <div
              aria-hidden="true"
              className="mt-2 h-2.5 w-full overflow-hidden rounded-full border border-offer bg-bg"
            >
              <div
                className="h-full rounded-full bg-offer motion-reduce:transition-none"
                style={{
                  width: `${drain * 100}%`,
                  transition: `width ${OFFER_MS}ms linear`,
                }}
              />
            </div>
          </Row>
        ) : null}

        {phase === 'filled' ? (
          <Row time="15:45" className="border-blue bg-blue-tint">
            <p className="font-bold text-blue-dark">Ingevuld door Sarah</p>
            <p className="flex items-center gap-2 text-sm text-ink-soft">
              <Check aria-hidden="true" className="size-4 shrink-0" />
              <span>
                <span data-numeric>1 min 12 s</span> na de annulering
              </span>
            </p>
          </Row>
        ) : null}

        <Row time="16:30" className="border-line bg-bg">
          <p className="font-bold">Lotte</p>
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <CalendarCheck aria-hidden="true" className="size-4 shrink-0" />
            Knippen en baard
          </p>
        </Row>
      </ol>

      <p className="sr-only">
        Voorbeeld: een afspraak komt vrij, wordt aangeboden aan de volgende klant die past, en is
        daarna opnieuw ingevuld.
      </p>
    </div>
  )
}
