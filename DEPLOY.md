# Deployen naar Vercel

## 1. Project importeren

Vercel, **Add New, Project**, kies de repo `Smix4444/Hackathon`.

| Instelling | Waarde |
|---|---|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |
| Root Directory | laat leeg |

Vercel herkent Vite meestal zelf; controleer alleen of Output Directory op `dist` staat.

## 2. Environment variables

Vercel heeft onderaan het importscherm een veld waar je een heel `.env`-blok in één keer
kan plakken. Neem het blok hieronder over, vul de twee waarden uit Supabase in, en vink
alle drie de omgevingen aan: **Production, Preview, Development**.

```
VITE_SUPABASE_URL=https://JOUW-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=PLAK-HIER-DE-ANON-KEY
VITE_DEMO_SLUG=studio-noor
```

Waar je die twee waarden vindt: Supabase, **Project Settings**, **API**.

- `VITE_SUPABASE_URL` is het veld **Project URL**.
- `VITE_SUPABASE_ANON_KEY` is de **anon public** key. Heeft jouw project in plaats daarvan
  een **publishable key** (begint met `sb_publishable_`), neem die dan. Allebei werken.

Deze twee horen in de browser terecht te komen, dat is de bedoeling: ze geven alleen
leesrechten, en schrijven kan enkel via de database-functies. Daarom hebben ze een
`VITE_`-prefix.

### Optioneel: de AI-invulhulp

Alleen nodig als je het veld *"Typ wanneer je kan"* op het inschrijfformulier wil. Zonder
deze variabele verbergt de app dat veld vanzelf, en werkt al de rest gewoon.

```
ANTHROPIC_API_KEY=sk-ant-PLAK-HIER-JE-SLEUTEL
```

**Zonder `VITE_`-prefix**, en zet hem apart. Alles met een `VITE_`-prefix wordt in de
JavaScript gebakken en is voor iedereen leesbaar; deze sleutel mag alleen op de server
staan, waar `api/parse-availability.ts` hem gebruikt.

## 3. Na het deployen controleren

1. Open de Vercel-URL. Je ziet de landingspagina.
2. Ga naar `/dashboard/studio-noor`. Je ziet de agenda met de slots van vandaag, en
   **niet** de melding "nog niet aan een database gekoppeld". Zie je die melding wel, dan
   zijn de env vars niet gezet of is er na het zetten niet opnieuw gedeployd.
3. Druk op **F5** op diezelfde pagina. Geen 404. Dat is waar `vercel.json` voor zorgt.
4. Ga naar `/s/studio-noor` en schrijf je in op de wachtlijst.
5. Terug op het dashboard: geef een plek van vandaag vrij en kijk of het aanbod binnen een
   paar seconden op de klantpagina verschijnt.

Wijzig je later een environment variable, dan moet je opnieuw deployen: Vite leest ze bij
het bouwen, niet bij het laden van de pagina.

## 4. Lokaal hetzelfde draaien

```bash
cp .env.example .env.local
```

Zet in `.env.local` dezelfde drie regels als hierboven en start met `npm run dev`.
`.env.local` staat in `.gitignore` en komt dus nooit in de repo terecht.

## Problemen

| Wat je ziet | Wat er aan de hand is |
|---|---|
| "Nog niet aan een database gekoppeld" | Env vars ontbreken, of er is niet opnieuw gedeployd |
| "Deze salon bestaat niet" | `seed.sql` is niet uitgevoerd, of `VITE_DEMO_SLUG` klopt niet |
| 404 na een refresh op een deep link | `vercel.json` staat niet in de root van de repo |
| Agenda blijft leeg | Draai `select public.reset_demo('studio-noor');` in de SQL-editor |
| Header zegt "Vernieuwt elke 4 s" in plaats van "Live" | Realtime komt er niet door; de app pollt dan, alles blijft werken |
