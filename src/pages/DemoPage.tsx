import { Link } from 'react-router'

import { Wordmark } from '../components/layout/Wordmark'
import { DEMO_SLUG } from '../config'

/** C1: salon en gsm naast elkaar, voor de pitch. */
export function DemoPage() {
  const frame = 'h-full w-full rounded-block border border-line bg-bg'

  return (
    <div className="flex h-dvh flex-col">
      <a href="#inhoud" className="skip-link">
        Naar inhoud
      </a>

      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-3 sm:px-8">
        <Wordmark />
        <p className="text-ink-soft">Salon en klant naast elkaar</p>
        <Link to="/" className="font-bold text-blue hover:text-blue-dark">
          Naar de startpagina
        </Link>
      </header>

      <main id="inhoud" className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[1.6fr_0.9fr]">
        <section aria-label="Salon-dashboard" className="min-h-0">
          <iframe title="Salon-dashboard" src={`/dashboard/${DEMO_SLUG}`} className={frame} />
        </section>
        <section aria-label="Klantpagina" className="mx-auto min-h-0 w-full max-w-[26rem]">
          <iframe title="Klantpagina" src={`/s/${DEMO_SLUG}`} className={frame} />
        </section>
      </main>
    </div>
  )
}
