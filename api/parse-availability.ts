import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'

/**
 * C3: "Typ wanneer je kan" omzetten naar dagen en uren.
 * De sleutel staat alleen op de server (ANTHROPIC_API_KEY, geen VITE_-prefix).
 */

const MAX_INPUT = 200

const AvailabilitySchema = z.object({
  days: z.array(z.number().int().min(1).max(7)).min(1).max(7),
  from: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  to: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
})

const SYSTEM = [
  'Je zet Nederlandse zinnen over beschikbaarheid om in gestructureerde data.',
  'days: ISO-weekdagen, maandag is 1 en zondag is 7.',
  'from en to: 24-uursnotatie HH:MM, from is vroeger dan to.',
  'Noemt iemand geen dagen, neem dan alle zeven dagen.',
  'Noemt iemand geen uren, neem dan 09:00 tot 21:00.',
  '"na vijf" betekent van 17:00 tot 21:00. "voormiddag" is 09:00 tot 12:00.',
  '"avond" is 17:00 tot 21:00. "weekend" is zaterdag en zondag.',
].join(' ')

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

/** Feature flag: zonder sleutel verbergt de UI het veld. */
export function GET(): Response {
  return new Response(null, { status: process.env.ANTHROPIC_API_KEY ? 204 : 404 })
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return new Response(null, { status: 404 })

  let text: unknown
  try {
    const body: unknown = await request.json()
    text = (body as { text?: unknown } | null)?.text
  } catch {
    return json({ error: 'Ongeldige invoer.' }, 400)
  }

  if (typeof text !== 'string' || text.trim().length === 0) {
    return json({ error: 'Ongeldige invoer.' }, 400)
  }

  const client = new Anthropic({ apiKey })

  try {
    const response = await client.messages.parse({
      model: 'claude-haiku-5-5',
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: 'user', content: text.slice(0, MAX_INPUT) }],
      output_config: { format: zodOutputFormat(AvailabilitySchema) },
    })

    const parsed = AvailabilitySchema.safeParse(response.parsed_output)
    if (!parsed.success) return json({ error: 'Kon dit niet omzetten.' }, 422)
    if (parsed.data.from >= parsed.data.to) {
      return json({ error: 'Kon dit niet omzetten.' }, 422)
    }

    return json(parsed.data, 200)
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return json({ error: 'De assistent is nu niet bereikbaar.' }, 502)
    }
    return json({ error: 'Er ging iets mis.' }, 500)
  }
}
