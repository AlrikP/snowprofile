// Bilingual text: an Estonian and an English version, either of which may be missing
// (docs/architecture.md, "Types"). The UI shows the one in its language and falls back to
// the other, marked as missing.
import type { Locale } from '#/paraglide/runtime.js'

export type Bilingual = { et: string | null; en: string | null }

// The fields as typed; an empty field is a missing translation.
export type BilingualInputValue = { et: string; en: string }

export function bilingualInputValue(stored: Bilingual | null): BilingualInputValue {
  return { et: stored?.et ?? '', en: stored?.en ?? '' }
}

export function parseBilingual(input: BilingualInputValue): Bilingual {
  return { et: input.et.trim() || null, en: input.en.trim() || null }
}

// What to show in the UI language: its own text, the other language's marked as a fallback,
// or nothing.
export function bilingualDisplay(
  value: Bilingual,
  locale: Locale,
): { text: string; lang: Locale; missing: Locale | null } | null {
  const other: Locale = locale === 'et' ? 'en' : 'et'
  const own = value[locale]
  if (own) return { text: own, lang: locale, missing: null }
  const fallback = value[other]
  return fallback ? { text: fallback, lang: other, missing: locale } : null
}
