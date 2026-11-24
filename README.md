# Invaller

Valt er iemand af? Je invaller staat al klaar.

Invaller vult een last-minute geannuleerde afspraak in een kapsalon binnen enkele minuten
opnieuw in, door de vrije plek live aan te bieden aan de klant op de wachtlijst die er het
best in past.

- **Salon:** geeft met één klik een afspraak vrij en ziet de plek live van vrij naar
  aangeboden naar ingevuld gaan, met de teruggewonnen tijd en omzet van die dag.
- **Klant:** schrijft zich zonder account in op de wachtlijst, krijgt het aanbod live op de
  gsm met een aftelklok, en accepteert of weigert.

Het volledige bouwplan staat in `PLAN (1).md`. Het ontwerpsysteem staat in sectie 4 daarvan.

## Stack

React 19, Vite, TypeScript, Tailwind v4, Supabase (Postgres, RPC, Realtime), Vercel.
Alle statusovergangen gebeuren atomair in Postgres-functies, zodat twee mensen die tegelijk
tikken nooit allebei de plek krijgen.

## Aan de praat krijgen

### 1. Supabase

1. Maak een Supabase-project aan (regio Frankfurt).
2. Plak `supabase/schema.sql` in de SQL-editor en voer het in één keer uit.
3. Doe daarna hetzelfde met `supabase/seed.sql`.
4. Kopieer Project URL en de anon key uit Project Settings, API.

Rooktest in de SQL-editor:

```sql
select status, customer_name, _fmt_time(starts_at) from slots order by starts_at;
select public.release_slot((select id from slots where status='booked'
  and starts_at::date > now()::date order by starts_at limit 1));
select type, message from events order by created_at;
select public.reset_demo('studio-noor');
```

Krijg je `function extensions.digest does not exist`, voer dan
`create extension if not exists pgcrypto with schema extensions;` opnieuw uit.

### 2. Lokaal draaien

```bash
npm install
cp .env.example .env.local   # vul VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in
npm run dev
```

Zonder sleutels start de app gewoon op en tonen de schermen een melding dat er nog geen
database gekoppeld is.

### 3. Vercel

Importeer de repo in Vercel (framework Vite) en zet dezelfde twee env vars, plus
`VITE_DEMO_SLUG=studio-noor`. `vercel.json` zorgt dat deep links zoals
`/dashboard/studio-noor` niet op een 404 uitkomen.

Wil je de optionele AI-functie ("Typ wanneer je kan"), zet dan ook `ANTHROPIC_API_KEY` in
Vercel. **Zonder `VITE_`-prefix**, anders staat je sleutel in de browser. Staat de sleutel
er niet, dan verbergt het formulier dat veld vanzelf.

## Commando's

| Commando | Doet |
|---|---|
| `npm run dev` | Dev-server |
| `npm run build` | Typecheck en productiebuild |
| `npm test` | Unit tests (vitest) |
| `npm run preview` | Productiebuild lokaal bekijken |

## Routes

| Route | Voor wie |
|---|---|
| `/` | Landingspagina |
| `/s/studio-noor` | Klant: wachtlijst, aanbod, vrije plekken |
| `/dashboard/studio-noor` | Salon: agenda, impact, QR, wachtlijst, activiteit |
| `/demo` | Dashboard en klantpagina naast elkaar, voor de pitch |

## Demo in vier stappen

1. Voer `select reset_demo('studio-noor');` uit. De agenda begint dan vanaf het volgende uur.
2. Laptop: open het dashboard. Gsm: scan de QR-code en schrijf je in voor *Knippen*, vandaag,
   09:00 tot 21:00.
3. Laptop: geef de eerste plek van vandaag vrij. Het aanbod verschijnt binnen twee seconden
   op de gsm.
4. Gsm: accepteer. Het dashboard wordt blauw en de impactstrook telt op.

Geen tweede toestel? Geef dan een plek van morgen vrij. Het aanbod gaat naar demo-klant
Bilal (vaste klant, dus voorrang) en op het blok staan knoppen om hem te laten weigeren,
waarna het doorschuift naar Sarah.

## Structuur

```
supabase/   schema.sql en seed.sql
src/lib/    pure functies (prijs, statistiek, tijd, fouten), met unit tests
src/domain/ types en zod-schema's
src/services/ de enige plek die Supabase aanspreekt
src/hooks/  data, realtime met polling-fallback, aftellen, verlopen
src/components/ ui, layout, salon, customer, landing
src/pages/  LandingPage, CustomerPage, DashboardPage, DemoPage, NotFoundPage
api/        optionele Vercel Function voor de AI-functie
```

Componenten praten nooit rechtstreeks met Supabase; dat doet alleen `services/`.
`lib/` is puur en krijgt `now` als parameter, zodat alles testbaar blijft.
