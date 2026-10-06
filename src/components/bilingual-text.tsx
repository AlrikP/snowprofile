import { type Bilingual, bilingualDisplay } from '#/lib/bilingual'
import { m } from '#/paraglide/messages.js'
import { getLocale } from '#/paraglide/runtime.js'
import { Badge } from './ui/badge'

// A bilingual value in the UI language. When that translation is missing it shows the other
// language, marked, so the gap is visible where it's read.
export function BilingualText({ value }: { value: Bilingual }) {
  const shown = bilingualDisplay(value, getLocale())
  if (!shown) return <span className="text-muted-foreground">{m.value_not_set()}</span>
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span lang={shown.lang}>{shown.text}</span>
      {shown.missing && (
        <Badge variant="outline" className="border-amber-500 text-amber-800">
          {shown.missing === 'en' ? m.translation_missing_en() : m.translation_missing_et()}
        </Badge>
      )}
    </span>
  )
}
