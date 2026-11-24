import { z } from 'zod'

/** Spiegelt de check-constraints uit sectie 6 van het plan. */

const NAME_PATTERN = /^[\p{L}][\p{L} '-]*$/u
const NAME_ERROR = 'Vul je voornaam in (2 tot 30 letters).'

export const firstNameSchema = z
  .string()
  .trim()
  .min(2, NAME_ERROR)
  .max(30, NAME_ERROR)
  .regex(NAME_PATTERN, NAME_ERROR)

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Gebruik een tijd zoals 09:00.')

export const LEAD_OPTIONS = [15, 30, 60, 120] as const

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export const joinSchema = z
  .object({
    firstName: firstNameSchema,
    treatmentId: z.string().uuid('Kies een behandeling.'),
    days: z
      .array(z.number().int().min(1).max(7))
      .min(1, 'Kies minstens één dag.')
      .max(7, 'Kies minstens één dag.'),
    timeFrom: timeSchema,
    timeTo: timeSchema,
    leadMinutes: z
      .number()
      .refine((v) => (LEAD_OPTIONS as readonly number[]).includes(v), 'Kies hoe snel je er kan zijn.'),
  })
  .refine((data) => minutesOf(data.timeTo) - minutesOf(data.timeFrom) >= 30, {
    message: 'Je venster moet minstens 30 minuten zijn.',
    path: ['timeTo'],
  })

export type JoinInput = z.infer<typeof joinSchema>

export const claimSchema = z.object({
  firstName: firstNameSchema,
})

export type ClaimInput = z.infer<typeof claimSchema>

export const settingsSchema = z.object({
  lastMinuteDiscount: z.boolean(),
  vipDiscountPct: z
    .number()
    .int('Vul een heel percentage in.')
    .min(0, 'Minstens 0 procent.')
    .max(50, 'Maximaal 50 procent.'),
  typicalWaitDays: z
    .number()
    .int('Vul een heel aantal dagen in.')
    .min(1, 'Minstens 1 dag.')
    .max(90, 'Maximaal 90 dagen.'),
})

export type SettingsInput = z.infer<typeof settingsSchema>
