export const APP_NAME = 'Replannr'
export const TAGLINE = 'Valt er iemand af? De volgende staat al klaar.'

/** Salon die de demo gebruikt. */
export const DEMO_SLUG = import.meta.env.VITE_DEMO_SLUG ?? 'studio-noor'

/** Polling-interval als het realtime-kanaal faalt (sectie 8). */
export const POLL_MS = 4000

/** Hoe lang we op een SUBSCRIBED-status wachten voor we gaan pollen. */
export const REALTIME_TIMEOUT_MS = 5000

/** Debounce op realtime-wijzigingen voor we refetchen. */
export const REALTIME_DEBOUNCE_MS = 150

/** Maximaal 1 expire_offers()-aanroep per zoveel ms. */
export const EXPIRE_THROTTLE_MS = 2000

/** Aantal events in de activiteitenfeed. */
export const FEED_LIMIT = 12
