import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * True zodra beide env vars gezet zijn. Is dat niet zo, dan tonen de
 * pagina's een configuratieboodschap in plaats van een netwerkfout.
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient = createClient(
  url ?? 'http://localhost:54321',
  anonKey ?? 'ontbrekende-sleutel',
  {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 10 } },
  },
)
