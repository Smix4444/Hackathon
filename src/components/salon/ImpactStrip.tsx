import type { Impact } from '../../lib/stats'
import { formatDuration, formatEuroShort, formatMinutes } from '../../lib/time'

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p data-numeric className="font-display text-2xl font-extrabold leading-none">
        {value}
      </p>
      <p className="text-sm text-ink-soft">{label}</p>
    </div>
  )
}

export function ImpactStrip({ impact }: { impact: Impact }) {
  if (impact.released === 0) {
    return (
      <section aria-labelledby="impact-kop" className="flex flex-col gap-3">
        <h2 id="impact-kop" className="text-lg">
          Vandaag teruggewonnen
        </h2>
        <p className="max-w-[46rem] text-ink-soft">
          Nog niets vrijgegeven vandaag. Zodra iemand afzegt, zie je hier wat je terugwint.
        </p>
      </section>
    )
  }

  return (
    <section aria-labelledby="impact-kop" className="flex flex-col gap-4">
      <h2 id="impact-kop" className="text-lg">
        Vandaag teruggewonnen
      </h2>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-12">
        <div className="flex flex-col gap-1">
          <p data-numeric className="font-display text-4xl font-extrabold leading-[0.9] text-blue">
            {formatMinutes(impact.recoveredMinutes)}
          </p>
          <p className="text-sm text-ink-soft">tijd die anders leeg bleef</p>
        </div>
        <Figure value={formatEuroShort(impact.recoveredCents)} label="omzet" />
        <Figure
          value={`${impact.filled} van ${impact.released}`}
          label="vrijgegeven plekken opgevuld"
        />
        <Figure
          value={impact.avgFillSeconds === null ? 'nog niets' : formatDuration(impact.avgFillSeconds * 1000)}
          label="gemiddeld tot ingevuld"
        />
      </div>
    </section>
  )
}
