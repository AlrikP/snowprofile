import { useState } from 'react'
import { formatPeriodDate, readPeriodDate } from '#/lib/period'
import { m } from '#/paraglide/messages.js'
import { Input } from './ui/input'
import { Label } from './ui/label'

type Period = { from?: string; to?: string }

// A period date typed as text; the filter gets it once it reads as one.
function PeriodField({
  id,
  hintId,
  label,
  value,
  onChange,
}: {
  id: string
  hintId: string
  label: string
  value: string | undefined
  onChange: (value: string | undefined) => void
}) {
  const [text, setText] = useState(value ? formatPeriodDate(value) : '')
  const [invalid, setInvalid] = useState(false)
  function commit() {
    if (!text.trim()) {
      setInvalid(false)
      onChange(undefined)
      return
    }
    const read = readPeriodDate(text)
    setInvalid(read === null)
    if (read) onChange(read)
  }
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="numeric"
        placeholder={m.period_filter_placeholder()}
        value={text}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : hintId}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit()
        }}
      />
      {invalid && (
        <p id={`${id}-error`} className="text-destructive text-xs">
          {m.period_filter_invalid()}
        </p>
      )}
    </div>
  )
}

// The From and To of a period filter, as search reads it: either end may be open, and each
// is a year, a month, or a day.
export function PeriodFilter({
  id,
  value,
  onChange,
}: {
  id: string
  value: Period
  onChange: (next: Period) => void
}) {
  const hintId = `${id}-hint`
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <PeriodField
          id={`${id}-from`}
          hintId={hintId}
          label={m.period_filter_from()}
          value={value.from}
          onChange={(from) => onChange({ from })}
        />
        <PeriodField
          id={`${id}-to`}
          hintId={hintId}
          label={m.period_filter_to()}
          value={value.to}
          onChange={(to) => onChange({ to })}
        />
      </div>
      <p id={hintId} className="text-muted-foreground text-xs">
        {m.period_filter_hint()}
      </p>
    </>
  )
}
