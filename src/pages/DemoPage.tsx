import { useState } from 'react'
import { Link } from 'react-router'

import { Wordmark } from '../components/layout/Wordmark'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { DEMO_SLUG } from '../config'

type View = 'beide' | 'desktop' | 'mobiel'

const FRAME = 'h-full w-full rounded-block border border-line bg-bg'

/** C1: salon en gsm naast elkaar, of elk apart, voor de pitch. */
export function DemoPage() {
  const [view, setView] = useState<View>('beide')

  return (
    <div className="flex h-dvh flex-col">
      <a href="#inhoud" className="skip-link">
        Naar inhoud
      </a>

      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-3 sm:px-8">
        <Wordmark />

        <SegmentedControl<View>
          label="Welk scherm tonen"
          value={view}
          onChange={setView}
          segments={[
            { value: 'beide', label: 'Naast elkaar' },
            { value: 'desktop', label: 'Desktop' },
            { value: 'mobiel', label: 'Mobiel' },
          ]}
        />

        <Link to="/" className="font-bold text-blue hover:text-blue-dark">
          Naar de startpagina
        </Link>
      </header>

      <main
        id="inhoud"
        className={[
          'grid min-h-0 flex-1 gap-4 p-4',
          view === 'beide' ? 'lg:grid-cols-[1.6fr_0.9fr]' : 'grid-cols-1',
        ].join(' ')}
      >
        {view !== 'mobiel' ? (
          <section aria-label="Salon-dashboard" className="min-h-0">
            <iframe title="Salon-dashboard" src={`/dashboard/${DEMO_SLUG}`} className={FRAME} />
          </section>
        ) : null}

        {view !== 'desktop' ? (
          <section
            aria-label="Klantpagina"
            className={[
              'mx-auto min-h-0 w-full',
              view === 'mobiel' ? 'max-w-[24rem]' : 'max-w-[26rem]',
            ].join(' ')}
          >
            <iframe title="Klantpagina" src={`/s/${DEMO_SLUG}`} className={FRAME} />
          </section>
        ) : null}
      </main>
    </div>
  )
}
