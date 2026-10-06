import { getLocale, type Locale } from '#/paraglide/runtime.js'

// A date and time in the UI language, such as "6. okt 2026, 14:05". The separator between
// date and time depends on the runtime's locale data.
export function formatDateTime(date: Date, locale: Locale = getLocale()): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'et-EE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

// A calendar date (YYYY-MM-DD) in the UI language, such as "14. juuni 1990". It names a
// day, not a moment, so it's formatted in UTC and never shifts by time zone.
export function formatDate(date: string, locale: Locale = getLocale()): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'et-EE', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}
