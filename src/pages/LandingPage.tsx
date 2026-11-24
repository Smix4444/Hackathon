import { Link } from 'react-router'

import { MiniAgenda } from '../components/landing/MiniAgenda'
import { Wordmark } from '../components/layout/Wordmark'
import { DEMO_SLUG } from '../config'

const STEPS = [
  {
    title: 'De klant zet zich op de wachtlijst',
    text: 'Scannen, voornaam, e-mailadres en wanneer je kan. Geen account nodig.',
  },
  {
    title: 'De salon geeft een plek vrij',
    text: 'Eén klik bij een afzegging. Geen telefoons, geen lijstjes.',
  },
  {
    title: 'Wie past, neemt de plek',
    text: 'Het aanbod gaat live naar de beste match, met een klok erop.',
  },
]

export function LandingPage() {
  return (
    <>
      <a href="#inhoud" className="skip-link">
        Naar inhoud
      </a>

      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-[76rem] items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Wordmark />
          <Link
            to="/demo"
            className="min-h-11 rounded-full px-4 py-2 font-bold text-blue transition-colors duration-150 hover:bg-blue-tint hover:text-blue-dark"
          >
            Bekijk de demo
          </Link>
        </div>
      </header>

      <main id="inhoud" className="mx-auto w-full max-w-[76rem] px-5 sm:px-8">
        <section className="grid items-start gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-20">
          <div className="flex flex-col items-start gap-6">
            <h1 className="max-w-[26ch] text-3xl sm:text-4xl">Een afzegging is geen verloren uur</h1>

            <p className="max-w-[46ch] text-lg text-ink-soft">
              Zegt een klant af, dan gaat die plek meteen naar iemand die er vandaag nog in past en
              snel kan zijn. De salon klikt één keer, de klant beslist in een minuut.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to={`/s/${DEMO_SLUG}`}
                className="flex min-h-14 items-center justify-center rounded-full bg-blue px-7 text-lg font-bold text-white transition-colors duration-150 hover:bg-blue-dark"
              >
                Ik zoek een afspraak
              </Link>
              <Link
                to={`/dashboard/${DEMO_SLUG}`}
                className="flex min-h-14 items-center justify-center rounded-full border border-line px-7 text-lg font-bold text-ink transition-colors duration-150 hover:bg-surface"
              >
                Ik heb een salon
              </Link>
            </div>

            <p className="max-w-[46ch] text-ink-soft">
              Studio Noor is onze demosalon. Je kan alles meteen uitproberen, op twee toestellen of
              op één.
            </p>
          </div>

          <MiniAgenda />
        </section>

        <section aria-labelledby="werkwijze-kop" className="border-t border-line py-14 lg:py-20">
          <h2 id="werkwijze-kop" className="text-2xl">
            Hoe het werkt
          </h2>

          <ol className="relative mt-10 grid gap-10 sm:grid-cols-3 sm:gap-8">
            <span
              aria-hidden="true"
              className="absolute left-2.5 right-2.5 top-3 hidden h-px bg-line sm:block"
            />
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative flex flex-col gap-3 sm:pt-12">
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1 hidden size-5 rounded-full border-4 border-bg bg-blue sm:block"
                />
                <p data-numeric className="font-display text-lg font-extrabold text-blue">
                  Stap {index + 1}
                </p>
                <h3 className="text-lg">{step.title}</h3>
                <p className="text-ink-soft">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="waarom-kop" className="border-t border-line py-14 lg:py-20">
          <h2 id="waarom-kop" className="text-2xl">
            Wat je eraan hebt
          </h2>
          <div className="mt-8 flex max-w-[60ch] flex-col gap-6 text-lg">
            <p>
              Voor de salon: een gat van veertig minuten is anders veertig minuten zonder inkomen.
              Replannr laat zien hoeveel tijd en omzet je op een dag terugwint.
            </p>
            <p>
              Voor de klant: je wacht normaal twee weken. Nu hoor je het zodra er iets vrijkomt dat
              bij je past, en betaal je last minute wat minder.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[76rem] flex-wrap items-center justify-between gap-4 px-5 py-8 sm:px-8">
          <Wordmark />
          <nav aria-label="Snel naar" className="flex flex-wrap gap-5">
            <Link to={`/s/${DEMO_SLUG}`} className="font-bold text-blue hover:text-blue-dark">
              Klantpagina
            </Link>
            <Link to={`/dashboard/${DEMO_SLUG}`} className="font-bold text-blue hover:text-blue-dark">
              Salon-dashboard
            </Link>
            <Link to="/demo" className="font-bold text-blue hover:text-blue-dark">
              Demo op één scherm
            </Link>
          </nav>
        </div>
      </footer>
    </>
  )
}
