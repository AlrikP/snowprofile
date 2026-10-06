import type { BilingualInputValue } from '#/lib/bilingual'
import { m } from '#/paraglide/messages.js'
import type { Locale } from '#/paraglide/runtime.js'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'

const LANGUAGES: { locale: Locale; label: () => string }[] = [
  { locale: 'et', label: m.field_in_et },
  { locale: 'en', label: m.field_in_en },
]

// One text in Estonian and English, side by side on wide screens. Each field carries its
// language, so spell checkers and screen readers use the right one.
export function BilingualField({
  id,
  legend,
  value,
  onChange,
  multiline = false,
  hint,
  error,
  hideLegend = false,
}: {
  id: string
  legend: string
  value: BilingualInputValue
  onChange: (value: BilingualInputValue) => void
  multiline?: boolean
  hint?: string
  error?: string
  // For a field whose section heading already names it; screen readers still get it.
  hideLegend?: boolean
}) {
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ')
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={hideLegend ? 'sr-only' : 'mb-2 text-sm leading-none font-medium'}>
        {legend}
      </legend>
      <div className="grid gap-4 md:grid-cols-2">
        {LANGUAGES.map(({ locale, label }) => {
          const field = {
            id: `${id}-${locale}`,
            lang: locale,
            value: value[locale],
            'aria-invalid': error ? true : undefined,
            'aria-describedby': describedBy || undefined,
          }
          return (
            <div key={locale} className="flex flex-col gap-2">
              <Label htmlFor={field.id}>{label()}</Label>
              {multiline ? (
                <Textarea
                  rows={5}
                  {...field}
                  onChange={(event) => onChange({ ...value, [locale]: event.target.value })}
                />
              ) : (
                <Input
                  {...field}
                  onChange={(event) => onChange({ ...value, [locale]: event.target.value })}
                />
              )}
            </div>
          )
        })}
      </div>
      {hint && (
        <p id={hintId} className="text-muted-foreground text-sm">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-destructive text-sm">
          {error}
        </p>
      )}
    </fieldset>
  )
}
