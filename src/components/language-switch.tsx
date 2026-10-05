import { useState } from 'react'
import { errorMessage } from '#/lib/errors'
import { m } from '#/paraglide/messages.js'
import { getLocale, type Locale, setLocale } from '#/paraglide/runtime.js'
import { Button } from './ui/button'

// Each language under its own name, so a reader finds theirs whatever the page is in.
export const LANGUAGES: { locale: Locale; name: string }[] = [
  { locale: 'et', name: 'Eesti' },
  { locale: 'en', name: 'English' },
]

// Switches the UI language. save keeps the choice on the signed-in user; setLocale then
// writes the cookie, and the page reloads in the new language. A failed save keeps the
// current language and sets error.
export function useLocaleChoice(save?: (locale: Locale) => Promise<unknown>) {
  const current = getLocale()
  const [error, setError] = useState<string | null>(null)

  async function choose(locale: Locale) {
    if (locale === current) return
    try {
      await save?.(locale)
    } catch (reason) {
      setError(errorMessage(reason))
      return
    }
    // The reload is explicit: save's response already set the cookie, so setLocale finds
    // the locale unchanged and wouldn't reload by itself.
    await setLocale(locale, { reload: false })
    window.location.reload()
  }

  return { current, choose, error }
}

export function LanguageSwitch({ save }: { save?: (locale: Locale) => Promise<unknown> }) {
  const { current, choose, error } = useLocaleChoice(save)

  return (
    <div className="flex flex-col gap-1">
      <div role="group" aria-label={m.language_label()} className="flex gap-2">
        {LANGUAGES.map(({ locale, name }) => (
          <Button
            key={locale}
            variant={locale === current ? 'secondary' : 'ghost'}
            size="sm"
            lang={locale}
            aria-pressed={locale === current}
            onClick={() => choose(locale)}
          >
            {name}
          </Button>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  )
}
