import { CircleAlert } from 'lucide-react'

/** Zichtbaar zolang de Supabase-sleutels niet ingevuld zijn. */
export function ConfigNotice() {
  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-block border border-offer bg-offer-tint px-5 py-5"
    >
      <p className="flex items-center gap-2 font-bold">
        <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
        Nog niet aan een database gekoppeld
      </p>
      <p className="text-ink-soft">
        Zet VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in je .env.local (zie .env.example) en start
        de app opnieuw. Daarna werkt de agenda met echte data.
      </p>
    </div>
  )
}
