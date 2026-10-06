// Approximate numbers, such as ~3500 h or > 700 000 €: a whole number and how precise it is
// (docs/architecture.md, "Types"). Shared by the number input, the server schemas, and the
// views.
import { m } from '#/paraglide/messages.js'
import { getLocale, type Locale } from '#/paraglide/runtime.js'

// The same values as the database's CHECK; a test keeps them equal.
export const QUALIFIERS = ['exact', 'approximately', 'more_than'] as const

export type Qualifier = (typeof QUALIFIERS)[number]

export type ApproximateNumber = { value: number; qualifier: Qualifier }

// The input's fields as typed: the number is text until it's saved.
export type ApproximateNumberInputValue = { value: string; qualifier: Qualifier }

export function approximateNumberInputValue(
  stored: ApproximateNumber | null,
  defaultQualifier: Qualifier = 'approximately',
): ApproximateNumberInputValue {
  return stored
    ? { value: String(stored.value), qualifier: stored.qualifier }
    : { value: '', qualifier: defaultQualifier }
}

// Null for an empty field. Spaces between digit groups are allowed, as in 10 000.
export function parseApproximateNumber(
  input: ApproximateNumberInputValue,
): { ok: true; value: ApproximateNumber | null } | { ok: false } {
  const digits = input.value.replace(/\s/g, '')
  if (!digits) return { ok: true, value: null }
  if (!/^\d+$/.test(digits) || !Number.isSafeInteger(Number(digits))) return { ok: false }
  return { ok: true, value: { value: Number(digits), qualifier: input.qualifier } }
}

export function qualifierLabel(qualifier: Qualifier, locale: Locale = getLocale()): string {
  switch (qualifier) {
    case 'exact':
      return m.qualifier_exact({}, { locale })
    case 'approximately':
      return m.qualifier_approximately({}, { locale })
    case 'more_than':
      return m.qualifier_more_than({}, { locale })
  }
}

// "approximately 4,200 h" or "more than 250 000 €"; an exact number shows alone.
export function formatApproximateNumber(
  number: ApproximateNumber,
  unit: 'hours' | 'euros',
  locale: Locale = getLocale(),
): string {
  const tag = locale === 'en' ? 'en-GB' : 'et-EE'
  const formatted =
    unit === 'euros'
      ? new Intl.NumberFormat(tag, {
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 0,
        }).format(number.value)
      : `${new Intl.NumberFormat(tag).format(number.value)} h`
  if (number.qualifier === 'exact') return formatted
  return `${qualifierLabel(number.qualifier, locale)} ${formatted}`
}
