# Replannr — bouwplan voor Claude Code

> **Instructie voor Claude Code**
> Lees dit volledige plan voor je begint. Werk **fase per fase** (sectie 11). Na elke fase:
> `npm run build` en `npm test` moeten slagen, commit met een duidelijke boodschap, en geef een korte statusupdate.
> Voeg geen features toe die niet in dit plan staan. Wijzig het databaseschema (sectie 6) niet zonder het te melden.
> Taken met **[JIJ]** doet een mens van het team (Supabase/Vercel-accounts), taken met **[CC]** doe jij.
> Alle UI-teksten zijn **Nederlands**, alle code-identifiers **Engels**.

---

## 0. In één oogopslag

| | |
|---|---|
| **Naam** | Replannr |
| **Tagline** | Valt er iemand af? De volgende staat al klaar. |
| **Eén zin** | Replannr vult een last-minute geannuleerde afspraak in een kapsalon binnen enkele minuten opnieuw in, door de vrije plek live aan te bieden aan de klant op de wachtlijst die er het best in past. |
| **Eindgebruiker (primair)** | Kleine zelfstandige kapper of salon in Antwerpen, staat zelf achter de stoel, heeft geen tijd om rond te bellen. |
| **Eindgebruiker (secundair)** | Klant die normaal ±2 weken moet wachten op een afspraak, maar flexibel is en vandaag of morgen kan inspringen. |
| **Stack** | React + Vite + TypeScript + Tailwind v4 · Supabase (Postgres, RPC, Realtime) · Vercel |
| **Bouwtijd** | 5 uur, met harde snijlijnen (sectie 11) |

### Hoe beide gebruikers tijd ervaren (de kern van het concept)
- **Salon:** een annulering = een gat van 30–90 minuten waarin de stoel leeg staat en de kapper niet betaald wordt. Rondbellen kost nóg meer tijd, en tegen dat iemand terugbelt is het slot voorbij.
- **Klant:** wachten = dagen of weken. Hij zou graag vroeger komen, maar weet nooit wanneer er iets vrijkomt.
- **Replannr verbindt die twee:** verloren tijd van de salon wordt gewonnen tijd voor de klant. Dat tonen we letterlijk: *"2 u 15 min teruggewonnen vandaag"* voor de salon en *"13 dagen sneller geholpen"* voor de klant.

---

## 1. Kritische keuzes (waarom dit plan er zo uitziet)

1. **Niet de oude Replannr opnieuw maken.** Replannr 1 = zoekplatform + boeken + wachtlijst met e-mail en 10 min voorrang + strikes, indigo-huisstijl. Deze versie verschilt bewust:
   - **Live aanbod in de app** met een zichtbare aftelklok, geen e-mail. Het aanbod "valt binnen" op je gsm terwijl de salon klikt.
   - **Slimme pasvorm:** een kortere behandeling mag in een langer vrijgekomen slot (Knippen 30 min past in een gat van 45 min). Matching op behandeling-duur, dag, tijdvenster en "hoe snel kan je er zijn".
   - **Last-minute prijs:** hoe dichter bij het tijdstip, hoe goedkoper een vrije plek (−10 / −20 / −30 %).
   - **Scan om in te vallen:** de salon toont een QR-code; wie scant staat binnen 20 seconden op de wachtlijst, zonder account.
   - **Impact in tijd** voor beide kanten, niet alleen in euro's.
   - Eigen naam, eigen visuele identiteit (sectie 4), geen zoekplatform, geen strikes.
2. **Geen login.** Een rolwissel *Klant / Salon* vervangt accounts. Dat spaart ±1 uur en de jury kan alles testen zonder wachtwoord. Klanten worden herkend via een **geheim apparaat-token** in localStorage (alleen de hash staat in de database), zodat niemand andermans aanbod kan accepteren.
3. **Alle statusovergangen in de database (Postgres-functies).** Accepteren, weigeren, vrijgeven en doorschuiven gebeuren atomair met row locks. Twee mensen die tegelijk tikken → precies één wint. Dit is ook ons sterkste technische verhaal.
4. **Realtime met polling-fallback.** Supabase Realtime voor het "live binnenvallen"; als het kanaal faalt (slechte wifi op de hackathon), valt de app automatisch terug op polling elke 4 s. De demo mag niet afhangen van één websocket.
5. **Verlopen aanbiedingen zonder server-cron.** Elke open pagina (dashboard of klant) roept `expire_offers()` aan zodra ze lokaal een verlopen aanbod ziet. De functie is idempotent en lock-veilig. In productie: `pg_cron` of een Edge Function (next step).
6. **Demo-data relatief aan "nu".** `reset_demo()` maakt de agenda telkens vanaf het volgende uur, zodat de demo op elk moment van de dag werkt.

### Eerlijke risico's
| Risico | Kans | Gevolg | Mitigatie |
|---|---|---|---|
| SQL-fout in Supabase kost veel tijd | Middel | Fase 1 loopt uit | Volledige, geteste SQL staat in sectie 6; in één keer plakken |
| Deep links geven 404 op Vercel | Hoog als vergeten | Demo-link werkt niet | `vercel.json` rewrite in fase 0 |
| Wifi op de hackathon blokkeert websockets | Middel | Geen live effect | Polling-fallback (sectie 8) |
| Te veel nice-to-haves, kernflow niet af | Hoog | Verliezen | Snijlijnen in sectie 11, kernflow eerst |
| Jury kiest in QR-demo een behandeling die niet past | Middel | "Geen match" tijdens demo | Pasvorm-matching op duur + duidelijk advies in demo-script |

---

## 2. Scope

### Must (kernflow, zonder dit geen demo)
- M1 Salon-agenda (vandaag/morgen) met tijdsloten uit de database
- M2 Plek vrijgeven met bevestiging → automatisch aanbod aan de best passende wachtende
- M3 Klant schrijft zich in op de wachtlijst (met validatie), zonder account
- M4 Klant krijgt het aanbod live, met aftelklok, en kan **accepteren** of **weigeren**
- M5 Weigeren of verlopen → automatisch door naar de volgende match
- M6 Salon ziet de status live veranderen: vrij → aangeboden → ingevuld
- M7 Impactstrook: teruggewonnen tijd, omzet, opvulratio, gemiddelde invultijd
- M8 Data blijft na refresh (Supabase + localStorage voor "mijn inschrijving")
- M9 Laad-, lege- en foutstatussen, responsive, toetsenbord + zichtbare focus

### Should (wow, goedkoop)
- S1 QR-code "Scan om in te vallen" op het dashboard
- S2 Last-minute prijs + "prijs zakt over 12 min naar € 28,80"
- S3 Successcherm met confetti + "13 dagen sneller geholpen" + agenda-bestand (.ics)
- S4 Live activiteitenfeed op het dashboard
- S5 "Vrij nu"-lijst op de klantpagina (direct boeken als niemand matcht)
- S6 VIP-ster voor vaste klanten (voorrang)
- S7 Instellingen: aanbodtijd, last-minute korting aan/uit, gemiddelde wachttijd, demo resetten
- S8 Simuleerknoppen voor demo-klanten ("Sarah accepteert / weigert") → demo op één toestel

### Could (alleen als je voorloopt)
- C1 `/demo`: salon en gsm naast elkaar op één scherm (2 iframes)
- C2 Landingspagina: links uitgelijnde kop en tekst, rechts één geanimeerde mini-agenda
- C3 AI: "Typ wanneer je kan" → vult dagen en uren automatisch in (Vercel Function + Claude API)
- C4 Tabtitel knippert "Plek vrij!" + trillen (Android) bij een nieuw aanbod

### Won't (wordt "next steps")
Login/accounts, echte sms/WhatsApp/push, agenda bewerken, meerdere salons/medewerkers, betalingen/voorschot, integraties (Salonized, Treatwell, Google Calendar), meertaligheid, server-side cron.

---

## 3. Routes, schermen en flows

| Route | Voor wie | Inhoud |
|---|---|---|
| `/` | iedereen | Links uitgelijnde kop en korte uitleg met 2 knoppen (*Ik zoek een afspraak* / *Ik heb een salon*, + *Bekijk de demo op één scherm* als C1 af is), rechts de levende mini-agenda; onderaan *Hoe het werkt* als horizontale tijdlijn |
| `/s/:slug` | klant | Inschrijven op de wachtlijst, mijn status, vrije plekken nu, aanbod-overname |
| `/dashboard/:slug` | salon | Impactstrook, agenda, QR, wachtlijst, activiteit, instellingen |
| `/demo` | jury/pitch | (C1) dashboard links, gsm-frame rechts |
| `*` | | 404 met link naar `/` |

Demo-salon: **Studio Noor**, Antwerpen, slug `studio-noor` (fictief).

Globale header: logo "Replannr", salonnaam, **segmented control *Klant | Salon*** (navigeert tussen `/s/:slug` en `/dashboard/:slug`, laatste keuze in localStorage).

### Flow A — kernflow (twee toestellen)
1. Klant opent `/s/studio-noor` (of scant de QR), vult voornaam, behandeling, dagen, tijdvenster en "hoe snel kan je er zijn" in → *Zet me op de wachtlijst*.
2. Klant ziet: *"Je staat op de wachtlijst voor Knippen. Je bent 2e in de rij."* + uitleg *"Houd deze pagina open. Komt er een plek vrij die past, dan verschijnt ze hier."*
3. Salon klikt in de agenda op de afspraak van Tom → *Plek vrijgeven* → bevestigingsdialoog → *Plek vrijgeven*.
4. Database kiest de best passende wachtende → het blok wordt zonnegeel: *"Aangeboden aan Sarah, nog 0:52"*.
5. Op de gsm van de klant schuift het aanbod over het hele scherm: groot tijdstip, behandeling, prijs (met korting doorgestreept), leeglopende tijdbalk, *Ik neem deze plek* / *Niet voor mij*.
6. Accepteren → confetti, *"Geregeld. Tot vandaag om 15:45."*, *"13 dagen sneller dan normaal"*, *Zet in mijn agenda*.
7. Dashboard: blok wordt blauw *"Ingevuld door Sarah, 1 min 12 s na de annulering"*, impactstrook telt op, feed toont het.

### Flow B — doorschuiven
Weigeren of de klok loopt af → aanbod verloopt → automatisch naar de volgende passende persoon. Niemand meer → blok koraal *"Vrije plek. Niemand op de wachtlijst past."* en de plek verschijnt in *Vrij nu* op de klantpagina (met last-minute prijs).

### Flow C — demo op één toestel (S8)
Seed bevat demo-klanten met een venster op **morgen**. Geef een plek van morgen vrij → aanbod gaat naar de best passende demo-klant (Bilal is VIP en krijgt voorrang, daarna Sarah) → op het gele blok staan knoppen *Bilal accepteert* / *Bilal weigert*. Weigeren → schuift door naar Sarah: zo toon je VIP-voorrang én doorschuiven op één scherm.

---

## 4. Ontwerpsysteem

### Sfeer
De sfeer van replannr.com is het vertrekpunt: warm, vriendelijk, overzichtelijk en rustig. We nemen die sfeer over, maar kopiëren niets — geen logo, teksten, layout of kleuren één-op-één. Replannr ziet er eigen uit: **witte basis, blauw als hoofdkleur, warme accenten in koraal en zonnegeel** die het levendig maken.

Het memorabele element blijft het **tijdblok zelf**: in de agenda zie je een afspraak letterlijk een gat worden (koraal), geel worden terwijl iemand beslist, en blauw worden zodra ze is ingevuld. Op de gsm is het aanbod één enorm tijdstip met een tijdbalk die leegloopt. Al de rest blijft stil, licht en sober.

### Kleur (Tailwind v4 `@theme`) — geen gradients
| Token | Hex | Rol |
|---|---|---|
| `--color-bg` | `#FFFFFF` | Paginaachtergrond: wit |
| `--color-surface` | `#F5F8FF` | Licht blauwe vlakken (agendakolom, zijpaneel) |
| `--color-ink` | `#0E1B3D` | Tekst en koppen (diep marineblauw) |
| `--color-ink-soft` | `#4A5878` | Secundaire tekst |
| `--color-line` | `#DCE3F0` | Randen van 1px |
| `--color-blue` | `#2457E6` | Primaire knoppen, links, focusring, actieve tabs |
| `--color-blue-dark` | `#1A3FAF` | Hover en pressed; blauwe tekst op licht blauw |
| `--color-blue-tint` | `#E8EFFE` | Geselecteerd, ingevulde slots |
| `--color-free` | `#FF6B4A` | Vrije plek: vulling, strepen, puls (koraal, warm) |
| `--color-free-text` | `#B93815` | Koraal als tekst (AA-contrast) |
| `--color-free-tint` | `#FFEDE7` | Achtergrond vrij blok |
| `--color-offer` | `#FFC233` | Aangeboden: tijdbalk (zonnegeel) |
| `--color-offer-tint` | `#FFF6DB` | Achtergrond aangeboden blok |
| `--color-danger` | `#C62828` | Foutmeldingen |

Statussen in de agenda:

| Status | Vorm | Icoon (lucide) | Label |
|---|---|---|---|
| geboekt | wit met grijze rand (`--color-line`) | `CalendarCheck` | naam en behandeling |
| vrij | koraal tint, koraal diagonale strepen, zachte puls | `CircleDashed` | *Vrije plek* |
| aangeboden | zonnegeel tint, gele tijdbalk die leegloopt | `Hourglass` | *Aangeboden aan Sarah, nog 0:42* |
| ingevuld | blauw tint, blauw vinkje | `Check` | *Ingevuld door Sarah* |

Kleur is **nooit** de enige drager: elke status heeft ook een tekstlabel en een lucide-icoon. Gebruik voor kleine tekst altijd `--color-free-text`, `--color-ink` of `--color-blue-dark`, nooit `--color-free` of `--color-offer`.

### Typografie
- **Display, koppen en grote tijden:** *Bricolage Grotesque* (variabel, `@fontsource-variable/bricolage-grotesque`), vet en met karakter: koppen, het grote tijdstip in het aanbod, cijfers in de impactstrook. Gewicht 700–800; smaller voor tijden via `font-variation-settings: "wdth" 75` als die as beschikbaar is.
- **Tekst en UI:** *Atkinson Hyperlegible* (`@fontsource/atkinson-hyperlegible`, 400/700). Gemaakt voor leesbaarheid, wat past bij onze toegankelijkheidseisen.
- **Verboden als zichtbaar font:** Inter, Roboto, Arial, Helvetica, `system-ui`. Ze mogen enkel als laatste fallback in de stack staan, nooit als wat je op het scherm ziet.
- Schaal (ratio 1.25, basis 16 px): 13, 16, 20, 25, 31, 39, 49. Groot tijdstip in het aanbod: `clamp(4.5rem, 22vw, 9rem)`, regelhoogte 0.9.
- Tijden en aftellers: `font-variant-numeric: tabular-nums`, zodat cijfers niet verspringen.

### Vorm en ruimte
- Veel witruimte. Randen 1px `--color-line`, bijna geen schaduw: **alleen op dialogen**.
- Radius verschilt bewust per niveau: tijdblokken 14px, knoppen volledig rond (pill), dialogen 20px.
- Warm en vriendelijk door ronde vormen, koraal- en gele accenten en menselijke copy. Niet door decoratie.
- Dashboard **niet** opknippen in identieke kaartjes met dezelfde schaduw: secties scheiden met witruimte en een kop.
- Ruimte in stappen van 4px; secties 32–48px uit elkaar.

### Strikt verboden (geen "AI-look")
- **Geen emoji, nergens:** niet in de UI, knoppen, toasts, titels, README of meldingen. Waar een icoon nodig is, gebruik lucide.
- **Geen gecentreerde hero.** De landingspagina heeft links een uitgelijnde kop en tekst, rechts een levende mini-agenda waarin één afspraak één keer van koraal (vrij) naar geel (aangeboden) naar blauw (ingevuld) gaat.
- Geen 3-koloms icoon-featuregrids, geen testimonial-carrousels, geen logo-muren, geen pricing-tabellen, geen generieke SaaS-layouts.
- Geen paars/blauwe gradients of welke gradient dan ook, geen glassmorphism, geen glow-effecten.
- Geen ALL-CAPS-labels of eyebrows boven koppen, geen middelpunt-scheidingen (`A · B`), geen pijl in knoppen, geen stock-illustraties of blobs.
- *Hoe het werkt* mag als 3 stappen, omdat het echt een volgorde is, maar dan als **horizontale tijdlijn**, niet als icoonkaartjes.

### Beweging (spaarzaam)
- Landingspagina: **één** animatie, de mini-agenda die één keer de cyclus koraal, geel, blauw doorloopt.
- Dashboard: een vrij blok pulseert zacht (koraal, 1.6 s); een blok wisselt van kleur in 300 ms als de status verandert.
- Aanbod op gsm: schuift van onder in (250 ms), tijdbalk loopt lineair leeg in zonnegeel.
- Confetti **alleen** bij accepteren (`canvas-confetti`, in de merkkleuren blauw, koraal en geel).
- `prefers-reduced-motion: reduce`: geen puls, geen schuif, geen confetti; tijdbalk vervangen door alleen het getal.

### Copy-stem
Nederlands, tutoyeren, sentence case, kort en warm, zonder uitroeptekens-spam. Knoppen zeggen wat er gebeurt en heten overal hetzelfde: *Plek vrijgeven*, *Ik neem deze plek*, *Zet me op de wachtlijst*. Vrijgeven geeft de toast *"Plek vrijgegeven"*. Foutmeldingen zeggen wat er mis is en wat je kunt doen, zonder excuses.

### Wireframes
Landingspagina (desktop ≥ 1024px), links uitgelijnd, geen gecentreerde hero:
```
┌──────────────────────────────────────────────────────────────────────┐
│ Replannr                                      [ Bekijk de demo ]    │
├───────────────────────────────────────────┬──────────────────────────┤
│ Een afzegging is geen                     │ Vandaag                  │
│ verloren uur                              │ 15:00  Tom               │
│                                           │        Knippen           │
│ Komt er een plek vrij, dan gaat ze meteen │ 15:45 ░░ Vrije plek ░░   │ ← koraal, pulseert
│ naar de klant die past en snel kan zijn.  │       ▒▒ Aangeboden ▒▒   │ ← wordt geel
│ Jij doet niets.                           │       ✓  Ingevuld        │ ← wordt blauw
│                                           │ 16:30  Milan             │
│ [ Probeer het dashboard ]                 │        Knippen en baard  │
│                                           │ (één cyclus, dan stil)   │
├───────────────────────────────────────────┴──────────────────────────┤
│ Hoe het werkt                                                        │
│  ──●───────────────────●───────────────────●──                       │
│    Klant zet zich      Salon geeft een     Wie past en snel kan,     │
│    op de wachtlijst    plek vrij           neemt de plek             │
└──────────────────────────────────────────────────────────────────────┘
```

Dashboard (desktop ≥ 1024px):
```
┌──────────────────────────────────────────────────────────────────────┐
│ Replannr   Studio Noor              [ Klant | Salon ]  Instellingen │
├──────────────────────────────────────────────────────────────────────┤
│ 2 u 15 min teruggewonnen vandaag   € 127    3 van 4 opgevuld   1:40 │ ← impactstrook
├───────────────────────────────────────────────┬──────────────────────┤
│ [Vandaag] [Morgen]                            │ Scan om in te vallen │
│ 15:00 ┃ Tom                   [Plek vrijgeven]│   ▓▓ QR ▓▓           │
│       ┃ Knippen                               │                      │
│ 15:30 ┃ Milan                                 │ Wachtlijst (4)       │
│       ┃ Knippen en baard                      │ Sarah (VIP)          │
│ 16:15 ┃░░ Vrije plek ░░ pulseert koraal       │ Knippen, vanaf 15:00 │
│       ┃                                       │                      │
│ 17:45 ┃▒▒ Aangeboden aan Sarah  0:42 ▒▒ geel  │ Live                 │
│ 18:15 ┃✓ Ingevuld door Bilal, 1 min 12 s      │ 15:02 Tom zegde af   │
│       ┃  (blokhoogte = duur)                  │                      │
└───────────────────────────────────────────────┴──────────────────────┘
```

Aanbod op gsm:
```
┌────────────────────┐
│ Plek vrij bij       │
│ Studio Noor         │
│                     │
│   15:45             │ ← enorm, Bricolage
│   vandaag           │
│ Knippen, 30 min     │
│ € 28,80  ̶€̶ ̶3̶2̶      │
│ ████████░░░░  0:41  │ ← gele tijdbalk loopt leeg
│                     │
│ [ Ik neem deze plek ]│ ← blauw, pill, volle breedte
│ [  Niet voor mij   ]│
└────────────────────┘
```

---

## 5. Architectuur

### Dependencies
```bash
npm create vite@latest replannr -- --template react-ts
cd replannr
npm i @supabase/supabase-js react-router zod react-hook-form @hookform/resolvers \
      sonner lucide-react qrcode.react canvas-confetti \
      @fontsource-variable/bricolage-grotesque @fontsource/atkinson-hyperlegible
npm i -D tailwindcss @tailwindcss/vite vitest @types/canvas-confetti
```
Geen state-library nodig: Supabase is de bron van waarheid, custom hooks houden de lokale kopie bij.

### Mappenstructuur
```
/
├─ PLAN.md                     ← dit bestand
├─ README.md                   ← test-URL's + uitleg (fase 6)
├─ vercel.json
├─ .env.example                ← zonder echte sleutels
├─ supabase/
│  ├─ schema.sql               ← sectie 6, in één keer uitvoeren
│  └─ seed.sql
├─ api/                        ← (C3) Vercel Function, enkel als AI gebouwd wordt
│  └─ parse-availability.ts
└─ src/
   ├─ main.tsx  App.tsx        ← router + Toaster
   ├─ config.ts                ← APP_NAME, DEMO_SLUG, POLL_MS
   ├─ styles/index.css         ← tailwind + @theme tokens + focus + reduced motion
   ├─ domain/
   │  ├─ types.ts              ← Salon, Treatment, Slot, WaitlistEntry, Offer, ActivityEvent
   │  └─ schemas.ts            ← zod: joinSchema, claimSchema, settingsSchema
   ├─ lib/                     ← PURE functies, geen React, geen Supabase → unit tests
   │  ├─ pricing.ts            ← priceFor, nextPriceDrop (spiegelt SQL price_for)
   │  ├─ stats.ts              ← computeImpact, daysSaved
   │  ├─ queue.ts              ← waitlistPosition
   │  ├─ time.ts               ← formatTime, formatDayLabel, formatDuration, isoDow (Europe/Brussels)
   │  ├─ errors.ts             ← DB-foutcodes → Nederlandse boodschappen
   │  ├─ ics.ts                ← buildIcs
   │  └─ *.test.ts
   ├─ services/                ← ENIGE plek die Supabase aanspreekt
   │  ├─ supabase.ts           ← createClient met env vars
   │  ├─ salonService.ts       ← getSalonBySlug, getTreatments, updateSettings, resetDemo
   │  ├─ slotService.ts        ← listSlots(salonId, from, to), releaseSlot, claimFreeSlot
   │  ├─ waitlistService.ts    ← listWaitlist, joinWaitlist, leaveWaitlist, setVip
   │  ├─ offerService.ts       ← listOffersForEntries, listOffersForSalon, acceptOffer, declineOffer, simulateResponse, expireOffers
   │  └─ eventService.ts       ← listEvents
   ├─ storage/
   │  └─ local.ts              ← veilige localStorage-wrapper (try/catch): role, myEntries
   ├─ hooks/
   │  ├─ useAsync.ts           ← {data, status: 'loading'|'ready'|'error', error, refetch}
   │  ├─ useSalon.ts  useSlots.ts  useWaitlist.ts  useOffers.ts  useEvents.ts
   │  ├─ useRealtime.ts        ← kanaal + polling-fallback (sectie 8)
   │  ├─ useNow.ts             ← gedeelde tik (1 s)
   │  ├─ useCountdown.ts       ← resterende ms + fractie voor de tijdbalk
   │  ├─ useExpiryEngine.ts    ← roept expireOffers() als een zichtbaar aanbod verlopen is
   │  └─ useMyEntries.ts       ← mijn inschrijvingen (localStorage) + hun live status
   ├─ components/
   │  ├─ ui/                   ← herbruikbaar, zonder domeinkennis
   │  │  Button, Field (label + hint + fout), TextInput, Select, DayPicker, TimeRange,
   │  │  SegmentedControl, Dialog (native <dialog>), Badge, Spinner, Skeleton,
   │  │  EmptyState, ErrorState, DrainBar, VisuallyHidden
   │  ├─ layout/  AppHeader, RoleSwitch, PageShell
   │  ├─ salon/   ImpactStrip, DayTabs, AgendaTimeline, SlotBlock, ReleaseDialog,
   │  │           QrCard, WaitlistPanel, ActivityFeed, SettingsDialog, SimulateButtons
   │  └─ customer/ JoinForm, WaitingCard, OfferTakeover, SuccessView, FreeNowList, ClaimDialog
   └─ pages/  LandingPage, CustomerPage, DashboardPage, DemoPage, NotFoundPage
```

### Regels voor de scheiding UI ↔ data
- Componenten importeren **nooit** `supabase` rechtstreeks. Alleen `services/` doet dat.
- `lib/` is puur (input → output), zonder `Date.now()` binnenin: `now` komt als parameter → testbaar.
- Pagina's combineren hooks; componenten krijgen props en callbacks.
- Bedrijfsregels die moeten kloppen bij gelijktijdigheid (matching, accepteren) staan **in SQL**. `lib/` doet weergave-logica (prijs tonen, statistiek, positie).

### State
| Soort | Waar | Overleeft refresh? |
|---|---|---|
| Salon, agenda, wachtlijst, aanbiedingen, events | Supabase (bron van waarheid) → hooks | Ja |
| Mijn inschrijvingen `{entryId, token, salonSlug, firstName}` | localStorage `replannr.entries` | Ja |
| Gekozen rol | localStorage `replannr.role` | Ja |
| Gekozen dag op dashboard | URL-query `?dag=morgen` | Ja |
| Formulier | react-hook-form (lokaal) | Nee (bewust) |
| Huidige tijd | `useNow` | n.v.t. |

### Environment
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=        # anon/publishable key, mag in de browser
VITE_DEMO_SLUG=studio-noor
ANTHROPIC_API_KEY=             # (C3) ALLEEN in Vercel, NOOIT met VITE_-prefix
```

### `vercel.json` (verplicht, anders 404 op deep links)
```json
{
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
}
```

---

## 6. Database (Supabase) — `supabase/schema.sql`

**[JIJ]** Plak dit in de Supabase SQL-editor en voer in één keer uit. Daarna `seed.sql`.

> Getest op PostgreSQL 16: schema + seed, VIP-voorrang, weigeren → doorschuiven, verlopen → doorschuiven, fout token geweigerd, dubbele claim geweigerd (`SLOT_TAKEN`), check-constraints, interne functies en rechtstreekse writes geblokkeerd voor `anon`.

```sql
-- =========================================================
-- Replannr — schema.sql
-- =========================================================
create extension if not exists pgcrypto with schema extensions;

-- ---------- Tabellen ----------
create table public.salons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  name text not null check (char_length(name) between 2 and 60),
  city text not null default 'Antwerpen',
  offer_seconds int not null default 60 check (offer_seconds between 15 and 900),
  typical_wait_days int not null default 14 check (typical_wait_days between 1 and 90),
  last_minute_discount boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.treatments (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 40),
  duration_min int not null check (duration_min between 10 and 240),
  price_cents int not null check (price_cents between 0 and 100000),
  sort int not null default 0
);

create table public.slots (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  treatment_id uuid not null references public.treatments(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'booked'
    check (status in ('booked','free','offered','filled')),
  customer_name text,
  released_at timestamptz,
  current_offer_id uuid,
  filled_by_entry_id uuid,
  filled_treatment_id uuid,
  filled_at timestamptz,
  final_price_cents int,
  final_duration_min int,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  treatment_id uuid not null references public.treatments(id),
  first_name text not null check (char_length(btrim(first_name)) between 2 and 30),
  days smallint[] not null
    check (cardinality(days) between 1 and 7 and days <@ array[1,2,3,4,5,6,7]::smallint[]),
  time_from time not null,
  time_to time not null,
  lead_minutes int not null default 30 check (lead_minutes in (0,15,30,60,120)),
  is_vip boolean not null default false,
  is_demo boolean not null default false,
  status text not null default 'waiting'
    check (status in ('waiting','offered','booked','left')),
  created_at timestamptz not null default now(),
  check (time_to - time_from >= interval '30 minutes')
);

-- Geheime apparaat-tokens: RLS aan, GEEN policy → onleesbaar via de API
create table public.entry_tokens (
  entry_id uuid primary key references public.waitlist_entries(id) on delete cascade,
  token_hash text not null
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  slot_id uuid not null references public.slots(id) on delete cascade,
  entry_id uuid not null references public.waitlist_entries(id) on delete cascade,
  treatment_id uuid not null references public.treatments(id),
  status text not null default 'pending'
    check (status in ('pending','accepted','declined','expired')),
  price_cents int not null,
  original_price_cents int not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  responded_at timestamptz
);

create table public.events (
  id bigint generated always as identity primary key,
  salon_id uuid not null references public.salons(id) on delete cascade,
  type text not null check (type in
    ('released','offered','accepted','declined','expired','no_match','joined','claimed','left')),
  slot_id uuid,
  entry_id uuid,
  message text not null,
  created_at timestamptz not null default now()
);

create index on public.slots (salon_id, starts_at);
create index on public.waitlist_entries (salon_id, status, created_at);
create index on public.offers (slot_id);
create index on public.offers (entry_id);
create index on public.events (salon_id, created_at desc);

-- ---------- Row Level Security ----------
alter table public.salons            enable row level security;
alter table public.treatments        enable row level security;
alter table public.slots             enable row level security;
alter table public.waitlist_entries  enable row level security;
alter table public.entry_tokens      enable row level security;
alter table public.offers            enable row level security;
alter table public.events            enable row level security;

-- Demo: alles leesbaar, NIETS rechtstreeks schrijfbaar. Schrijven kan enkel via de functies hieronder.
create policy "read salons"     on public.salons           for select to anon, authenticated using (true);
create policy "read treatments" on public.treatments       for select to anon, authenticated using (true);
create policy "read slots"      on public.slots            for select to anon, authenticated using (true);
create policy "read waitlist"   on public.waitlist_entries for select to anon, authenticated using (true);
create policy "read offers"     on public.offers           for select to anon, authenticated using (true);
create policy "read events"     on public.events           for select to anon, authenticated using (true);
revoke all on public.entry_tokens from anon, authenticated;

-- Expliciete rechten (niet afhankelijk van Supabase-standaarden): lezen ja, schrijven nee
grant usage on schema public to anon, authenticated;
grant select on public.salons, public.treatments, public.slots,
                public.waitlist_entries, public.offers, public.events to anon, authenticated;
revoke insert, update, delete, truncate on public.salons, public.treatments, public.slots,
                public.waitlist_entries, public.offers, public.events from anon, authenticated;

-- ---------- Realtime ----------
alter publication supabase_realtime
  add table public.slots, public.waitlist_entries, public.offers, public.events;

-- ---------- Hulpfuncties ----------
create or replace function public.price_for(p_base int, p_starts timestamptz, p_discount boolean)
returns int language sql stable set search_path = public as $$
  select case
    when not p_discount                              then p_base
    when p_starts - now() < interval '30 minutes'    then round(p_base * 0.70)::int
    when p_starts - now() < interval '60 minutes'    then round(p_base * 0.80)::int
    when p_starts - now() < interval '180 minutes'   then round(p_base * 0.90)::int
    else p_base
  end
$$;

create or replace function public._fmt_time(p timestamptz)
returns text language sql stable as $$
  select to_char(p at time zone 'Europe/Brussels', 'HH24:MI')
$$;

create or replace function public._token_ok(p_entry uuid, p_token uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.entry_tokens
    where entry_id = p_entry
      and token_hash = encode(extensions.digest(p_token::text, 'sha256'), 'hex')
  )
$$;

-- Kies de best passende wachtende en maak een aanbod. Verwacht een slot met status 'free'.
create or replace function public._offer_next(p_slot uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  s        public.slots%rowtype;
  v_salon  public.salons%rowtype;
  v_entry  public.waitlist_entries%rowtype;
  v_t      public.treatments%rowtype;
  v_local  timestamp;
  v_slot_min int;
  v_offer  uuid;
  v_price  int;
begin
  select * into s from public.slots where id = p_slot for update;
  if not found or s.status <> 'free' or s.starts_at <= now() then
    return null;
  end if;

  select * into v_salon from public.salons where id = s.salon_id;
  v_local    := s.starts_at at time zone 'Europe/Brussels';
  v_slot_min := extract(epoch from (s.ends_at - s.starts_at))::int / 60;

  select e.* into v_entry
  from public.waitlist_entries e
  join public.treatments t on t.id = e.treatment_id
  where e.salon_id = s.salon_id
    and e.status = 'waiting'
    and t.duration_min <= v_slot_min                                   -- past in het gat
    and extract(isodow from v_local)::smallint = any (e.days)          -- juiste dag
    and v_local::time >= e.time_from                                   -- binnen venster
    and (v_local + make_interval(mins => t.duration_min))::time <= e.time_to
    and s.starts_at >= now() + make_interval(mins => e.lead_minutes)   -- kan er op tijd zijn
    and not exists (select 1 from public.offers o
                    where o.slot_id = s.id and o.entry_id = e.id)      -- nog niet gevraagd
  order by e.is_vip desc, e.created_at asc
  limit 1
  for update of e skip locked;

  if not found then
    return null;
  end if;

  select * into v_t from public.treatments where id = v_entry.treatment_id;
  v_price := public.price_for(v_t.price_cents, s.starts_at, v_salon.last_minute_discount);

  insert into public.offers
    (salon_id, slot_id, entry_id, treatment_id, price_cents, original_price_cents, expires_at)
  values
    (s.salon_id, s.id, v_entry.id, v_t.id, v_price, v_t.price_cents,
     now() + make_interval(secs => v_salon.offer_seconds))
  returning id into v_offer;

  update public.slots set status = 'offered', current_offer_id = v_offer where id = s.id;
  update public.waitlist_entries set status = 'offered' where id = v_entry.id;

  insert into public.events (salon_id, type, slot_id, entry_id, message)
  values (s.salon_id, 'offered', s.id, v_entry.id,
          format('%s aangeboden aan %s', public._fmt_time(s.starts_at), v_entry.first_name));

  return v_offer;
end $$;

create or replace function public._log_no_match(p_slot uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s public.slots%rowtype;
begin
  select * into s from public.slots where id = p_slot;
  insert into public.events (salon_id, type, slot_id, message)
  values (s.salon_id, 'no_match', s.id,
          format('Niemand op de wachtlijst past bij %s. De plek staat open.', public._fmt_time(s.starts_at)));
end $$;

-- Accepteren of weigeren. Lock-volgorde altijd: slot → offer (geen deadlocks met expire_offers).
create or replace function public._respond(p_offer uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_slot_id uuid;
  s   public.slots%rowtype;
  o   public.offers%rowtype;
  v_t public.treatments%rowtype;
  v_name text;
begin
  select slot_id into v_slot_id from public.offers where id = p_offer;
  if v_slot_id is null then raise exception 'OFFER_NOT_FOUND'; end if;

  select * into s from public.slots  where id = v_slot_id for update;
  select * into o from public.offers where id = p_offer   for update;

  if o.status <> 'pending' then raise exception 'OFFER_CLOSED'; end if;
  if o.expires_at < now()  then raise exception 'OFFER_EXPIRED'; end if;
  if s.status <> 'offered' or s.current_offer_id is distinct from o.id then
    raise exception 'SLOT_TAKEN';
  end if;

  select first_name into v_name from public.waitlist_entries where id = o.entry_id;

  if p_accept then
    select * into v_t from public.treatments where id = o.treatment_id;

    update public.offers set status = 'accepted', responded_at = now() where id = o.id;
    update public.slots set
      status = 'filled', filled_by_entry_id = o.entry_id, filled_treatment_id = o.treatment_id,
      filled_at = now(), final_price_cents = o.price_cents, final_duration_min = v_t.duration_min
    where id = s.id;
    update public.waitlist_entries set status = 'booked' where id = o.entry_id;

    insert into public.events (salon_id, type, slot_id, entry_id, message)
    values (s.salon_id, 'accepted', s.id, o.entry_id,
            format('%s neemt %s over', v_name, public._fmt_time(s.starts_at)));

    return jsonb_build_object(
      'status', 'accepted', 'slot_id', s.id, 'starts_at', s.starts_at,
      'price_cents', o.price_cents, 'original_price_cents', o.original_price_cents,
      'treatment', v_t.name, 'duration_min', v_t.duration_min);
  else
    update public.offers set status = 'declined', responded_at = now() where id = o.id;
    update public.waitlist_entries set status = 'waiting' where id = o.entry_id;
    update public.slots set status = 'free', current_offer_id = null where id = s.id;

    insert into public.events (salon_id, type, slot_id, entry_id, message)
    values (s.salon_id, 'declined', s.id, o.entry_id,
            format('%s sloeg %s af', v_name, public._fmt_time(s.starts_at)));

    if public._offer_next(s.id) is null then perform public._log_no_match(s.id); end if;
    return jsonb_build_object('status', 'declined');
  end if;
end $$;

-- ---------- Publieke functies (RPC) ----------

-- Salon: afspraak vrijgeven → meteen aanbieden
create or replace function public.release_slot(p_slot uuid)
returns text language plpgsql security definer set search_path = public as $$
declare s public.slots%rowtype;
begin
  select * into s from public.slots where id = p_slot for update;
  if not found               then raise exception 'SLOT_NOT_FOUND'; end if;
  if s.status <> 'booked'    then raise exception 'SLOT_NOT_BOOKED'; end if;
  if s.starts_at <= now()    then raise exception 'SLOT_IN_PAST'; end if;

  update public.slots set status = 'free', released_at = now() where id = s.id;

  insert into public.events (salon_id, type, slot_id, message)
  values (s.salon_id, 'released', s.id,
          format('%s zegde af voor %s', coalesce(s.customer_name, 'Een klant'), public._fmt_time(s.starts_at)));

  if public._offer_next(s.id) is null then
    perform public._log_no_match(s.id);
    return 'free';
  end if;
  return 'offered';
end $$;

-- Klant: op de wachtlijst. Token wordt client-side gegenereerd (crypto.randomUUID) en alleen gehasht opgeslagen.
create or replace function public.join_waitlist(
  p_salon_slug text, p_treatment uuid, p_first_name text, p_days smallint[],
  p_from time, p_to time, p_lead int, p_token uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_salon uuid; v_entry uuid; v_slot uuid;
begin
  select id into v_salon from public.salons where slug = p_salon_slug;
  if v_salon is null then raise exception 'SALON_NOT_FOUND'; end if;
  if not exists (select 1 from public.treatments where id = p_treatment and salon_id = v_salon) then
    raise exception 'TREATMENT_NOT_FOUND';
  end if;

  insert into public.waitlist_entries
    (salon_id, treatment_id, first_name, days, time_from, time_to, lead_minutes)
  values
    (v_salon, p_treatment, btrim(p_first_name), p_days, p_from, p_to, p_lead)
  returning id into v_entry;

  insert into public.entry_tokens (entry_id, token_hash)
  values (v_entry, encode(extensions.digest(p_token::text, 'sha256'), 'hex'));

  insert into public.events (salon_id, type, entry_id, message)
  values (v_salon, 'joined', v_entry, format('%s staat op de wachtlijst', btrim(p_first_name)));

  -- Staat er al een vrije plek open die past? Meteen aanbieden.
  for v_slot in
    select id from public.slots
    where salon_id = v_salon and status = 'free' and starts_at > now()
    order by starts_at
  loop
    perform public._offer_next(v_slot);
    exit when (select status from public.waitlist_entries where id = v_entry) = 'offered';
  end loop;

  return v_entry;
end $$;

create or replace function public.leave_waitlist(p_entry uuid, p_token uuid)
returns void language plpgsql security definer set search_path = public as $$
declare e public.waitlist_entries%rowtype;
begin
  if not public._token_ok(p_entry, p_token) then raise exception 'NOT_YOUR_ENTRY'; end if;
  select * into e from public.waitlist_entries where id = p_entry for update;
  if e.status <> 'waiting' then raise exception 'ENTRY_BUSY'; end if;
  update public.waitlist_entries set status = 'left' where id = p_entry;
  insert into public.events (salon_id, type, entry_id, message)
  values (e.salon_id, 'left', e.id, format('%s verliet de wachtlijst', e.first_name));
end $$;

create or replace function public.accept_offer(p_offer uuid, p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_entry uuid;
begin
  select entry_id into v_entry from public.offers where id = p_offer;
  if v_entry is null then raise exception 'OFFER_NOT_FOUND'; end if;
  if not public._token_ok(v_entry, p_token) then raise exception 'NOT_YOUR_OFFER'; end if;
  return public._respond(p_offer, true);
end $$;

create or replace function public.decline_offer(p_offer uuid, p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_entry uuid;
begin
  select entry_id into v_entry from public.offers where id = p_offer;
  if v_entry is null then raise exception 'OFFER_NOT_FOUND'; end if;
  if not public._token_ok(v_entry, p_token) then raise exception 'NOT_YOUR_OFFER'; end if;
  return public._respond(p_offer, false);
end $$;

-- Enkel voor demo-klanten (is_demo = true)
create or replace function public.simulate_response(p_offer uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_demo boolean;
begin
  select e.is_demo into v_demo
  from public.offers o join public.waitlist_entries e on e.id = o.entry_id
  where o.id = p_offer;
  if v_demo is distinct from true then raise exception 'NOT_DEMO_ENTRY'; end if;
  return public._respond(p_offer, p_accept);
end $$;

-- Idempotent: door elke open pagina aan te roepen
create or replace function public.expire_offers()
returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in
    select s.id as slot_id, s.salon_id, s.starts_at, o.id as offer_id, o.entry_id
    from public.slots s
    join public.offers o on o.id = s.current_offer_id
    where s.status = 'offered' and o.status = 'pending' and o.expires_at < now()
    for update of s skip locked
  loop
    update public.offers set status = 'expired', responded_at = now() where id = r.offer_id;
    update public.waitlist_entries set status = 'waiting' where id = r.entry_id and status = 'offered';
    update public.slots set status = 'free', current_offer_id = null where id = r.slot_id;

    insert into public.events (salon_id, type, slot_id, entry_id, message)
    values (r.salon_id, 'expired', r.slot_id, r.entry_id,
            format('Geen reactie op %s, door naar de volgende', public._fmt_time(r.starts_at)));

    if public._offer_next(r.slot_id) is null then perform public._log_no_match(r.slot_id); end if;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Klant: vrije plek direct boeken (als niemand matchte)
create or replace function public.claim_free_slot(p_slot uuid, p_first_name text, p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s public.slots%rowtype; v_t public.treatments%rowtype; v_salon public.salons%rowtype;
  v_entry uuid; v_local timestamp; v_price int;
begin
  select * into s from public.slots where id = p_slot for update;
  if not found then raise exception 'SLOT_NOT_FOUND'; end if;
  if s.status <> 'free' or s.starts_at <= now() then raise exception 'SLOT_TAKEN'; end if;

  select * into v_t     from public.treatments where id = s.treatment_id;
  select * into v_salon from public.salons     where id = s.salon_id;
  v_local := s.starts_at at time zone 'Europe/Brussels';
  v_price := public.price_for(v_t.price_cents, s.starts_at, v_salon.last_minute_discount);

  insert into public.waitlist_entries
    (salon_id, treatment_id, first_name, days, time_from, time_to, lead_minutes, status)
  values
    (s.salon_id, s.treatment_id, btrim(p_first_name),
     array[extract(isodow from v_local)::smallint], '00:00', '23:59', 0, 'booked')
  returning id into v_entry;

  insert into public.entry_tokens (entry_id, token_hash)
  values (v_entry, encode(extensions.digest(p_token::text, 'sha256'), 'hex'));

  update public.slots set
    status = 'filled', filled_by_entry_id = v_entry, filled_treatment_id = v_t.id,
    filled_at = now(), final_price_cents = v_price, final_duration_min = v_t.duration_min
  where id = s.id;

  insert into public.events (salon_id, type, slot_id, entry_id, message)
  values (s.salon_id, 'claimed', s.id, v_entry,
          format('%s boekte de vrije plek van %s', btrim(p_first_name), public._fmt_time(s.starts_at)));

  return jsonb_build_object(
    'status', 'accepted', 'entry_id', v_entry, 'slot_id', s.id, 'starts_at', s.starts_at,
    'price_cents', v_price, 'original_price_cents', v_t.price_cents,
    'treatment', v_t.name, 'duration_min', v_t.duration_min);
end $$;

create or replace function public.set_vip(p_entry uuid, p_vip boolean)
returns void language sql security definer set search_path = public as $$
  update public.waitlist_entries set is_vip = p_vip where id = p_entry;
$$;

create or replace function public.update_salon_settings(
  p_slug text, p_offer_seconds int, p_discount boolean, p_typical_wait_days int)
returns void language sql security definer set search_path = public as $$
  update public.salons
  set offer_seconds = p_offer_seconds,
      last_minute_discount = p_discount,
      typical_wait_days = p_typical_wait_days
  where slug = p_slug;
$$;

-- Demo opnieuw opbouwen, relatief aan NU
create or replace function public.reset_demo(p_slug text default 'studio-noor')
returns void language plpgsql security definer set search_path = public as $$
declare
  v_salon uuid;
  t_cut uuid; t_beard uuid; t_color uuid; t_brush uuid;
  v_today    date := (now() at time zone 'Europe/Brussels')::date;
  v_tomorrow date := v_today + 1;
  v_tmr_dow  smallint := extract(isodow from v_tomorrow)::smallint;
  v_plan_today text[] := array['cut','beard','color','cut','brush','cut','beard','cut'];
  v_plan_tmr   text[] := array['cut','cut','beard','color','cut','brush'];
  v_names text[] := array['Tom','Milan','Yasmine','Arne','Fatima','Jules','Noah','Lotte',
                          'Ines','Emma','Lucas','Nora','Elias','Amira'];
  v_cursor timestamptz; v_t uuid; v_dur int; i int; n int := 0;
begin
  select id into v_salon from public.salons where slug = p_slug;
  if v_salon is null then raise exception 'SALON_NOT_FOUND'; end if;

  delete from public.events           where salon_id = v_salon;
  delete from public.offers           where salon_id = v_salon;
  delete from public.slots            where salon_id = v_salon;
  delete from public.waitlist_entries where salon_id = v_salon;

  select id into t_cut   from public.treatments where salon_id = v_salon and name = 'Knippen';
  select id into t_beard from public.treatments where salon_id = v_salon and name = 'Knippen en baard';
  select id into t_color from public.treatments where salon_id = v_salon and name = 'Kleuren';
  select id into t_brush from public.treatments where salon_id = v_salon and name = 'Brushing';

  -- Vandaag: aaneengesloten agenda vanaf het volgende volle uur
  v_cursor := date_trunc('hour', now()) + interval '1 hour';
  for i in 1..array_length(v_plan_today, 1) loop
    v_t := case v_plan_today[i] when 'cut' then t_cut when 'beard' then t_beard
                                when 'color' then t_color else t_brush end;
    select duration_min into v_dur from public.treatments where id = v_t;
    n := n + 1;
    insert into public.slots (salon_id, treatment_id, starts_at, ends_at, status, customer_name)
    values (v_salon, v_t, v_cursor, v_cursor + make_interval(mins => v_dur), 'booked', v_names[n]);
    v_cursor := v_cursor + make_interval(mins => v_dur);
  end loop;

  -- Morgen vanaf 10:00
  v_cursor := (v_tomorrow + time '10:00') at time zone 'Europe/Brussels';
  for i in 1..array_length(v_plan_tmr, 1) loop
    v_t := case v_plan_tmr[i] when 'cut' then t_cut when 'beard' then t_beard
                              when 'color' then t_color else t_brush end;
    select duration_min into v_dur from public.treatments where id = v_t;
    n := n + 1;
    insert into public.slots (salon_id, treatment_id, starts_at, ends_at, status, customer_name)
    values (v_salon, v_t, v_cursor, v_cursor + make_interval(mins => v_dur), 'booked', v_names[n]);
    v_cursor := v_cursor + make_interval(mins => v_dur);
  end loop;

  -- Demo-wachtlijst: enkel MORGEN beschikbaar, zodat echte (jury-)inschrijvingen
  -- voor vandaag nooit door demo-klanten worden ingepikt.
  insert into public.waitlist_entries
    (salon_id, treatment_id, first_name, days, time_from, time_to, lead_minutes, is_vip, is_demo, created_at)
  values
    (v_salon, t_cut,   'Sarah', array[v_tmr_dow], '09:00', '13:00', 30, false, true, now() - interval '3 days'),
    (v_salon, t_color, 'Hanne', array[v_tmr_dow], '09:00', '17:00', 60, false, true, now() - interval '2 days'),
    (v_salon, t_cut,   'Bilal', array[v_tmr_dow], '10:00', '12:30', 30, true,  true, now() - interval '1 day'),
    (v_salon, t_brush, 'Lien',  array[v_tmr_dow], '13:00', '18:00', 30, false, true, now() - interval '5 hours');
end $$;

-- ---------- Rechten ----------
revoke execute on function public._offer_next(uuid)          from public, anon, authenticated;
revoke execute on function public._respond(uuid, boolean)    from public, anon, authenticated;
revoke execute on function public._token_ok(uuid, uuid)      from public, anon, authenticated;
revoke execute on function public._log_no_match(uuid)        from public, anon, authenticated;

grant execute on function
  public.release_slot(uuid),
  public.join_waitlist(text, uuid, text, smallint[], time, time, int, uuid),
  public.leave_waitlist(uuid, uuid),
  public.accept_offer(uuid, uuid),
  public.decline_offer(uuid, uuid),
  public.simulate_response(uuid, boolean),
  public.expire_offers(),
  public.claim_free_slot(uuid, text, uuid),
  public.set_vip(uuid, boolean),
  public.update_salon_settings(text, int, boolean, int),
  public.reset_demo(text),
  public.price_for(int, timestamptz, boolean)
to anon, authenticated;
```

### `supabase/seed.sql`
```sql
insert into public.salons (slug, name, city, offer_seconds, typical_wait_days)
values ('studio-noor', 'Studio Noor', 'Antwerpen', 60, 14)
on conflict (slug) do nothing;

insert into public.treatments (salon_id, name, duration_min, price_cents, sort)
select s.id, v.name, v.dur, v.price, v.sort
from public.salons s,
     (values ('Knippen', 30, 3200, 1),
             ('Knippen en baard', 45, 4200, 2),
             ('Kleuren', 90, 8500, 3),
             ('Brushing', 30, 2800, 4)) as v(name, dur, price, sort)
where s.slug = 'studio-noor'
  and not exists (select 1 from public.treatments t where t.salon_id = s.id);

select public.reset_demo('studio-noor');
```

### Snelle rooktest in de SQL-editor [JIJ]
```sql
select status, customer_name, _fmt_time(starts_at) from slots order by starts_at;   -- 14 geboekte slots
select public.release_slot((select id from slots where status='booked' and starts_at::date > now()::date order by starts_at limit 1));
-- verwacht: 'offered' (aan demo-klant Sarah of Bilal-VIP)
select type, message from events order by created_at;
select public.reset_demo('studio-noor');                                             -- terug naar begin
```
Foutmelding `function extensions.digest does not exist` → voer `create extension if not exists pgcrypto with schema extensions;` opnieuw uit.

### Foutcodes → UI (`src/lib/errors.ts`)
| Code | Boodschap |
|---|---|
| `SLOT_TAKEN` | Iemand anders was je net voor. Je blijft op de wachtlijst. |
| `OFFER_EXPIRED` | De tijd is om. De plek ging naar de volgende in de rij. |
| `OFFER_CLOSED` | Dit aanbod is niet meer geldig. |
| `NOT_YOUR_OFFER` / `NOT_YOUR_ENTRY` | Dit aanbod hoort bij een ander toestel. |
| `SLOT_NOT_BOOKED` | Deze afspraak is al vrijgegeven. |
| `SLOT_IN_PAST` | Deze afspraak is al begonnen. |
| `ENTRY_BUSY` | Je hebt nu een aanbod openstaan. Beantwoord dat eerst. |
| `SALON_NOT_FOUND` | Deze salon bestaat niet. Controleer de link. |
| Postgres `23514` (check) | Een van de velden klopt niet. Controleer je invoer. |
| netwerkfout | Geen verbinding. Controleer je internet en probeer opnieuw. |
| overig | Er ging iets mis. Probeer opnieuw. |

---

## 7. Domeinlogica in TypeScript (`src/lib`, met unit tests)

```ts
// pricing.ts — MOET overeenkomen met SQL price_for
export const DISCOUNT_TIERS = [
  { underMinutes: 30, pct: 30 },
  { underMinutes: 60, pct: 20 },
  { underMinutes: 180, pct: 10 },
] as const;
export function priceFor(baseCents: number, startsAt: Date, now: Date, discountOn: boolean):
  { cents: number; pct: number };
// Volgende prijsdaling: wanneer en naar welk bedrag (null als er geen meer komt)
export function nextPriceDrop(baseCents: number, startsAt: Date, now: Date, discountOn: boolean):
  { inMs: number; cents: number; pct: number } | null;

// stats.ts — impact van VANDAAG (released_at op de huidige dag in Europe/Brussels)
export function computeImpact(slots: Slot[], now: Date): {
  released: number; filled: number; fillRate: number;          // 0..1
  recoveredMinutes: number; recoveredCents: number;
  avgFillSeconds: number | null;                                // filled_at - released_at
};
// "X dagen sneller": typical_wait_days - dagen tussen inschrijving en afspraak, min 0
export function daysSaved(typicalWaitDays: number, joinedAt: Date, slotStart: Date): number;

// queue.ts — positie in de rij voor dezelfde behandeling (vip eerst, dan oudste)
export function waitlistPosition(entries: WaitlistEntry[], entryId: string): number | null;

// time.ts — alles in Europe/Brussels met Intl.DateTimeFormat('nl-BE')
formatTime(d) → "15:45";  formatDayLabel(d, now) → "vandaag" | "morgen" | "do 26 nov"
formatDuration(ms) → "1 min 12 s" | "45 s";  formatCountdown(ms) → "0:42"
isoDow(d) → 1..7;  formatEuro(cents) → "€ 28,80"
```
**Tests (vitest):** prijs op elke drempel (179/180, 59/60, 29/30 min) en met korting uit; `nextPriceDrop` geeft null onder 30 min; `computeImpact` met lege lijst → nullen en `avgFillSeconds: null`; `daysSaved` nooit negatief; `waitlistPosition` met VIP; `formatDuration`. Zod-schema's: geldige en ongeldige invoer.

### Validatie (`src/domain/schemas.ts`, spiegelt de SQL-checks)
| Veld | Regel | Foutboodschap |
|---|---|---|
| Voornaam | 2–30 tekens, letters, spatie, `-`, `'` | "Vul je voornaam in (2 tot 30 letters)." |
| Behandeling | verplicht, uit lijst | "Kies een behandeling." |
| Dagen | minstens 1 | "Kies minstens één dag." |
| Van / tot | `HH:MM`, tot ≥ van + 30 min | "Je venster moet minstens 30 minuten zijn." |
| Hoe snel kan je er zijn | 15 / 30 / 60 / 120 min | — (select met standaard 30) |

Standaardwaarden voor snelle demo's: dagen = vandaag en morgen, 09:00–21:00, 30 min.

---

## 8. Realtime, verlopen en synchronisatie

### `useRealtime({ key, salonId, tables, onChange })`
1. `supabase.channel(key)` met per tabel `postgres_changes` (`event: '*'`, `filter: 'salon_id=eq.<id>'`) voor `slots`, `offers`, `waitlist_entries`, `events`.
2. Bij elke wijziging: `onChange()` debounced (150 ms) → hooks doen `refetch()`. Eenvoudig en altijd correct; we patchen geen lokale state.
3. **Fallback:** komt de status niet binnen 5 s op `SUBSCRIBED`, of krijg je `CHANNEL_ERROR`/`TIMED_OUT` → `setInterval(refetch, 4000)`. Stop het pollen zodra het kanaal alsnog `SUBSCRIBED` is.
4. Opruimen bij unmount (`supabase.removeChannel`).
5. Klein indicatorpuntje in de header: *Live* (blauw) of *Vernieuwt elke 4 s* (grijs), met tekst, niet alleen kleur.

### `useExpiryEngine(offers)`
Op dashboard én klantpagina: elke seconde (via `useNow`) controleren of een zichtbaar aanbod `pending` is met `expires_at < now`. Zo ja → `expireOffers()` (max. 1 aanroep per 2 s, throttle). Server is de scheidsrechter, de client "port" alleen.

### Aanbod bij de klant
- `useMyEntries` leest `replannr.entries` uit localStorage en haalt die rijen + hun offers op.
- Actief aanbod = offer met `status = 'pending'` en `expires_at > now` voor een van mijn entries → `OfferTakeover` opent (native `<dialog>.showModal()`).
- Bij openen: `document.title = 'Plek vrij! — Replannr'` (C4), `navigator.vibrate?.([200, 100, 200])` (C4), focus naar het tijdstip.
- Klokverschil: aftellen gebeurt met `expires_at` van de server; bij een paar seconden verschil wint de server (accepteren na de echte deadline → `OFFER_EXPIRED` → nette melding).

---

## 9. Schermen in detail (states, a11y)

### Dashboard `/dashboard/:slug`
- **ImpactStrip:** grootste cijfer = *teruggewonnen tijd vandaag* (Bricolage, groot), daarnaast omzet, *X van Y opgevuld*, gemiddelde invultijd. Bij 0: *"Nog niets vrijgegeven vandaag. Zodra iemand afzegt, zie je hier wat je terugwint."*
- **DayTabs:** *Vandaag* / *Morgen* (`role="tablist"`, pijltjestoetsen).
- **AgendaTimeline:** verticale lijst; tijd links (tabular-nums), blokhoogte ∝ duur (min. 56px). Elk blok is een `<article>` met een kop (tijd + naam) en een statusregel.
  - *Geboekt:* wit, naam, behandeling, knop **Plek vrijgeven** (verborgen als het slot begonnen is).
  - *Vrij:* `--color-free-tint` met diagonale strepen, koraal rand die pulseert, tekst *"Vrije plek. Niemand op de wachtlijst past."*
  - *Aangeboden:* `--color-offer-tint`, `DrainBar`, *"Aangeboden aan Sarah"* + `0:42`. Bij demo-klanten (S8): *Sarah accepteert* / *Sarah weigert*.
  - *Ingevuld:* `--color-blue-tint`, blauw vinkje, *"Ingevuld door Sarah"* + *"1 min 12 s na de annulering"* + behandeling als die anders is dan origineel ("Knippen in een slot van 45 min").
- **ReleaseDialog:** *"Tom komt niet om 15:00?"* / *"We bieden de plek meteen aan de best passende klant op je wachtlijst aan."* / **Plek vrijgeven** + *Annuleren*. Tijdens de call: knop disabled met spinner. Na succes: toast *"Plek vrijgegeven"* of *"Plek vrijgegeven. Niemand past, ze staat nu open."*
- **QrCard (S1):** QR naar `${location.origin}/s/${slug}`, tekst *"Scan om in te vallen"*, link eronder als tekst (voor wie niet kan scannen), knop *Link kopiëren*.
- **WaitlistPanel:** wachtenden (status `waiting`/`offered`) met behandeling, dagen en venster, ster-knop (S6) `aria-pressed`. Leeg: *"Nog niemand op de wachtlijst. Laat klanten de QR-code scannen."*
- **ActivityFeed (S4):** laatste 12 events, nieuwste boven, `aria-live="polite"`, tijd + boodschap.
- **SettingsDialog (S7):** aanbodtijd (30 s / 60 s / 2 min / 5 min), last-minute korting aan/uit, gemiddelde wachttijd (dagen), **Demo resetten** (bevestiging).
- **States:** laden → skeleton-blokken; fout → `ErrorState` met *Opnieuw proberen*; salon niet gevonden → 404-tekst met link.

### Klantpagina `/s/:slug`
- Kop: salonnaam, stad, *"Gemiddeld wacht je hier 14 dagen. Met Replannr vaak maar een paar uur."*
- **Geen actieve inschrijving → JoinForm:** velden in sectie 7. Elke input met `<label>`, hint via `aria-describedby`, fout via `aria-invalid` + boodschap onder het veld, focus naar het eerste foute veld bij verzenden. Knop **Zet me op de wachtlijst** (disabled + spinner tijdens verzenden). Serverfout → boodschap boven de knop met `role="alert"`.
- **Wel actieve inschrijving → WaitingCard:** *"Je staat op de wachtlijst voor Knippen"*, *"Je bent 2e in de rij"*, je dagen en venster, *"Houd deze pagina open. Komt er een plek vrij die past, dan verschijnt ze hier."*, knop *Van de wachtlijst gaan* (bevestiging). Status `booked` → kaart met je afspraak + *Opnieuw inschrijven*.
- **FreeNowList (S5):** vrije toekomstige slots met tijdstip, behandeling, prijs (doorgestreept origineel), *"Prijs zakt over 12 min naar € 25,60"*, knop **Boek deze plek** → `ClaimDialog` (enkel voornaam) → `SuccessView`. Leeg: *"Op dit moment is er geen vrije plek. Zet je op de wachtlijst, dan krijg je de eerstvolgende die past."*
- **OfferTakeover:** zie wireframe. `role="alertdialog"`, `aria-labelledby` = titel, `aria-describedby` = details. Esc sluit de dialoog **niet** als weigeren (aanbod blijft lopen; er komt een balk *"Je hebt een openstaand aanbod"* om te heropenen). Schermlezer: visueel verborgen live-regio meldt *"Nog 30 seconden"* en *"Nog 10 seconden"*, niet elke seconde. Verlopen → *"De tijd is om. De plek ging naar de volgende in de rij. Je blijft op de wachtlijst."*
- **SuccessView (S3):** confetti, *"Geregeld. Tot vandaag om 15:45."*, *"Je bent 13 dagen sneller geholpen dan normaal."*, prijs, **Zet in mijn agenda** (.ics-download), *Terug naar Studio Noor*.

### Toegankelijkheid (geldt overal)
- `:focus-visible { outline: 3px solid var(--color-blue); outline-offset: 3px; }`; op blauwe vlakken een witte ring. Nooit `outline: none` zonder vervanging.
- Skip-link *"Naar inhoud"*. Eén `<h1>` per pagina, logische koppen.
- Alles bedienbaar met Tab/Shift+Tab/Enter/Spatie/Esc/pijltjes (tabs, segmented control).
- Native `<dialog>` voor focus trap en Esc. Focus terug naar de knop die de dialoog opende.
- Aanraakdoelen ≥ 44×44px. Contrast AA (controleer koraal en geel: gebruik `--color-free-text`, `--color-ink` of `--color-blue-dark` voor tekst).
- `lang="nl"` op `<html>`.

### Responsive
- Klant: mobile-first, één kolom, max. 560px breed gecentreerd op desktop.
- Dashboard: < 1024px één kolom (impact → agenda → QR → wachtlijst → feed); ≥ 1024px twee kolommen (agenda 2/3, zijpaneel 1/3).
- Test op 360px, 768px, 1280px.

---

## 10. Optionele AI-feature (C3) — alleen als fase 5 klaar is

**"Typ wanneer je kan"** boven de dagen/uren in de JoinForm: *"bv. dinsdag of donderdag na vijf"* → knop *Vul in*.
- `api/parse-availability.ts` als Vercel Function (Web API-signatuur, `export async function POST(request: Request)`; check de Vercel-docs voor Vite-projecten).
- Input max. 200 tekens. Roept de Anthropic Messages API aan met `ANTHROPIC_API_KEY` (server-only), model `claude-haiku-5-5`, en vraagt strikt JSON: `{ "days": number[1-7], "from": "HH:MM", "to": "HH:MM" }`. Valideer het antwoord met zod; ongeldig → 422.
- UI: vult de velden in en markeert ze kort; de gebruiker controleert en verstuurt zelf. Fout → *"Dat lukte niet. Vul je dagen en uren hieronder zelf in."*
- Geen sleutel ingesteld → het veld wordt niet getoond (feature flag via `GET /api/parse-availability` → 204/404).
- Lokaal testen vraagt `vercel dev`; anders test je enkel op de preview-deploy.

---

## 11. Bouwfasen (5 uur)

> Deploy al in fase 0 en daarna na elke fase (git push → Vercel). Zo is er altijd een werkende https-link.

### Fase 0 — Opzet (0:00–0:25)
- [JIJ] Supabase-project aanmaken (regio Frankfurt), `schema.sql` en `seed.sql` uitvoeren, rooktest doen, Project URL en anon key kopiëren.
- [JIJ] GitHub-repo aanmaken; Vercel → *Import project* (framework Vite), env vars invullen.
- [CC] Vite + React + TS opzetten, dependencies installeren, Tailwind v4 via `@tailwindcss/vite`, fonts importeren, `@theme`-tokens (sectie 4), focus- en reduced-motion-CSS, router met lege pagina's, `vercel.json`, `.env.example`, `src/services/supabase.ts`, `vitest`-config, scripts `test` en `build`.
- **Klaar als:** de Vercel-URL toont de landingspagina, `/dashboard/studio-noor` toont na refresh geen 404, en de salonnaam komt uit Supabase.

### Fase 1 — Datalaag (0:25–1:10)
- [CC] `domain/types.ts`, alle `services/*`, `storage/local.ts`, `lib/*` + tests, `hooks/useAsync`, `useNow`, `useRealtime` (met fallback), `useSalon`, `useSlots`, `useWaitlist`, `useOffers`, `useEvents`, `useExpiryEngine`, `useMyEntries`, `lib/errors.ts`.
- **Klaar als:** `npm test` groen; een tijdelijke debugpagina toont slots en verandert live na `release_slot` uit de SQL-editor.

### Fase 2 — Salon-dashboard (1:10–2:10)
- [CC] UI-basiscomponenten (`Button`, `Dialog`, `Badge`, `Spinner`, `Skeleton`, `EmptyState`, `ErrorState`, `SegmentedControl`, `DrainBar`), `AppHeader` + `RoleSwitch`, `ImpactStrip`, `DayTabs`, `AgendaTimeline`, `SlotBlock` (4 statussen), `ReleaseDialog`, `WaitlistPanel`, `ActivityFeed`, `SimulateButtons` (S8).
- **Klaar als:** de plek van morgen 10:00 vrijgeven → blok wordt zonnegeel (aangeboden aan Bilal, VIP) met aftellende balk → *Bilal weigert* → gaat naar Sarah → *Sarah accepteert* → blauw, impact telt op, feed toont 3 regels. Werkt met alleen het toetsenbord.

### Fase 3 — Klantflow (2:10–3:15)
- [CC] `JoinForm` (+ `Field`, `TextInput`, `Select`, `DayPicker`, `TimeRange`), `WaitingCard`, `OfferTakeover`, `SuccessView` (confetti, daysSaved, .ics), foutafhandeling met `errors.ts`.
- **Klaar als:** laptop (dashboard) + gsm (klantpagina via Vercel-URL): inschrijven → plek van vandaag vrijgeven → aanbod verschijnt binnen 2 s op de gsm → accepteren → beide schermen kloppen. Weigeren → slot gaat naar de volgende of staat open. Refresh op beide toestellen verliest niets.

> **Snijlijn 1 (3:15):** werkt Flow A niet volledig? Stop met al het andere en los dat eerst op. Daarna rechtstreeks naar fase 6.

### Fase 4 — Wow-laag (3:15–3:55)
- [CC] `QrCard` (S1), `FreeNowList` + `ClaimDialog` + last-minute prijs met *"zakt over…"* (S2/S5), VIP-ster (S6), `SettingsDialog` + demo resetten (S7), C4 (titel + trillen).
- **Klaar als:** QR scannen met een gsm leidt naar het formulier; een vrije plek zonder match is te boeken met korting; instellingen blijven na refresh.

### Fase 5 — Afwerking en kwaliteit (3:55–4:35)
- [CC] Alle laad/leeg/fout-states nalopen (tabel in sectie 9), responsive op 360/768/1280, focus-volgorde, `aria-*`, reduced motion, landingspagina met korte uitleg (C2 alleen de eenvoudige versie: de mini-agenda die één keer van koraal via geel naar blauw gaat), 404-pagina, `README.md`.
- [CC] Elk scherm aflopen tegen de ontwerpregels van sectie 4 (checklist *Ontwerpregels* in sectie 13) en afwijkingen meteen rechtzetten.
- [JIJ] Lighthouse (Accessibility ≥ 95, Best Practices ≥ 90) op klant- en dashboardpagina.

> **Snijlijn 2 (4:35):** geen nieuwe features meer. Alleen bugs.

### Fase 6 — Testen en demo klaarzetten (4:35–5:00)
- [JIJ + CC] QA-checklist (sectie 13) volledig doorlopen op gsm en laptop.
- [JIJ] `select reset_demo('studio-noor');` vlak voor de demo (de agenda start dan vanaf het volgende uur).
- Als er nog tijd is, in deze volgorde: C1 `/demo` split-view → C3 AI.

---

## 12. Jury-eisen → waar ze zitten

| Eis | Hoe we eraan voldoen |
|---|---|
| Behoefte rond tijd | Lege stoel (salon) ↔ weken wachten (klant); impact in uren en dagen |
| Duidelijke eindgebruiker | Kleine zelfstandige kapsalon + flexibele klant |
| Kernflow tastbaar, van invoer tot resultaat | Inschrijven → vrijgeven → live aanbod → accepteren → ingevuld + impact |
| Online, testbaar via https | Vercel-URL, geen login nodig |
| Data invoeren, acties, resultaten | Formulier, vrijgeven/accepteren/weigeren/boeken, impactstrook + succescherm |
| Responsive mobiel & desktop | Klant mobile-first, dashboard 1→2 kolommen |
| Labels, zichtbare focus, toetsenbord | Sectie 9, native `<dialog>`, skip-link, focusring |
| Consistente interface | Eén tokenset, herbruikbare `ui/`-componenten, vaste actienamen |
| Bewaart kerngegevens na refresh | Supabase + localStorage (`replannr.entries`, `replannr.role`) |
| Invoervalidatie | zod client-side + CHECK-constraints server-side |
| Laad-, lege- en foutstatussen | Skeleton, EmptyState met actie, ErrorState met *Opnieuw proberen* |
| Herbruikbare componenten, UI ≠ datalogica | `components/ui`, `services/`, `lib/` (puur, getest), SQL voor regels |
| Technische keuzes uitleggen | Sectie 1 en 5: atomaire Postgres-functies, Realtime + fallback, token-hash |
| Next steps | Sectie 14 |

---

## 13. QA-checklist (fase 6)

**Kernflow**
- [ ] Inschrijven met geldige data → wachtkaart met positie
- [ ] Ongeldige data → foutboodschap per veld, focus op het eerste foute veld
- [ ] Plek van vandaag vrijgeven → aanbod op een tweede toestel binnen 2 s
- [ ] Accepteren → succescherm; dashboard blauw; impact klopt
- [ ] Weigeren → naar de volgende of *"staat open"*; verschijnt in *Vrij nu*
- [ ] Niets doen tot de tijd om is → automatisch door (ook als enkel het dashboard open staat)
- [ ] Twee toestellen tikken tegelijk *Boek deze plek* → één succes, één nette melding
- [ ] Refresh midden in een aanbod → aanbod komt terug met de juiste resterende tijd

**Robuustheid**
- [ ] Wifi uit en aan → indicator springt naar polling en terug, data klopt
- [ ] Onbekende slug → nette melding
- [ ] Rechtstreeks `/dashboard/studio-noor` openen op Vercel → geen 404
- [ ] localStorage leeggemaakt → app werkt, je inschrijving is weg (verwacht)

**Kwaliteit**
- [ ] Hele kernflow met alleen het toetsenbord
- [ ] 360px-breedte: niets valt buiten beeld, knoppen ≥ 44px
- [ ] Reduced motion aan → geen puls, geen confetti
- [ ] Geen console-errors, geen sleutels in de repo (`.env` in `.gitignore`)

**Ontwerpregels (sectie 4) — elk scherm nalopen**
- [ ] Geen emoji in UI, knoppen, toasts, titels, meldingen of README; iconen zijn lucide
- [ ] Geen gradient, geen glassmorphism, geen glow; schaduw alleen op dialogen
- [ ] Zichtbare fonts zijn alleen Bricolage Grotesque en Atkinson Hyperlegible (geen Inter, Roboto, Arial, Helvetica, `system-ui`)
- [ ] Alleen de tokens uit sectie 4; geen oude kleuren, geen kleur buiten het palet
- [ ] Elke status heeft kleur **en** tekstlabel **en** icoon; tijden en aftellers tabular-nums
- [ ] Landingspagina: links uitgelijnde kop, rechts de mini-agenda; geen gecentreerde hero, geen featuregrid, geen testimonials, geen logo-muur, geen pricing; *Hoe het werkt* als horizontale tijdlijn
- [ ] Geen ALL-CAPS-labels of eyebrows, geen `A · B`, geen pijl in knoppen, geen stock-illustraties of blobs
- [ ] Radius: tijdblokken 14px, knoppen pill, dialogen 20px; randen 1px
- [ ] Copy is Nederlands, tutoyerend, sentence case; knoppen zeggen wat er gebeurt

**Demo-scenario om te oefenen (geen pitchtekst)**
1. `reset_demo` uitvoeren. Laptop: dashboard. Gsm: QR scannen → inschrijven met *Knippen*, dagen vandaag, 09:00–21:00.
2. Laptop: eerste plek van vandaag vrijgeven (bij voorkeur Knippen of Knippen en baard: Knippen past in beide).
3. Gsm: aanbod accepteren. Laptop: blauw + impact.
4. Back-up zonder gsm: plek van morgen 10:00 vrijgeven → *Bilal weigert* → gaat naar Sarah → *Sarah accepteert*.

---

## 14. Next steps (voor wat we niet afkregen en daarna)

1. **Echte meldingen:** Web Push (PWA) en sms/WhatsApp, zodat de klant de pagina niet open hoeft te houden.
2. **Salon-accounts:** Supabase Auth + RLS per salon (nu kan iedereen met de link vrijgeven).
3. **Server-side doorschuiven:** `pg_cron` of een Edge Function voor verlopen aanbiedingen, onafhankelijk van open pagina's.
4. **Agenda beheren of koppelen:** slots en medewerkers aanmaken, of importeren uit Salonized/Treatwell/Google Calendar.
5. **Slimmere matching:** twee kleine gaten combineren, kettingreactie (iemand vervroegen geeft een later slot vrij), voorkeur voor medewerker.
6. **No-shows voorkomen:** herinnering met *"Kom je nog?"*, voorschot, AI-inschatting van no-show-risico.
7. **Inzichten over weken:** welke momenten het vaakst leeg vallen, maandrapport.
8. **Meertalig** (NL/FR/EN) en meerdere salons met een eigen pagina.
