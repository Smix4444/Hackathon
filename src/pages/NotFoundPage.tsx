import { Link } from 'react-router'

import { AppHeader } from '../components/layout/AppHeader'
import { PageShell } from '../components/layout/PageShell'

export function NotFoundPage() {
  return (
    <>
      <AppHeader />
      <PageShell width="narrow">
        <div className="flex flex-col items-start gap-5">
          <h1 className="text-3xl">Deze pagina bestaat niet</h1>
          <p className="text-ink-soft">
            Misschien is de link verouderd of staat er een tikfout in. Begin opnieuw vanaf de
            startpagina.
          </p>
          <Link
            to="/"
            className="flex min-h-11 items-center rounded-full bg-blue px-5 font-bold text-white transition-colors duration-150 hover:bg-blue-dark"
          >
            Naar de startpagina
          </Link>
        </div>
      </PageShell>
    </>
  )
}
