import {
  type PeriodError,
  type PeriodInputValue,
  type PeriodParts,
  isYearOnly,
  periodErrorMessage,
} from '#/lib/period'
import { m } from '#/paraglide/messages.js'
import { getLocale } from '#/paraglide/runtime.js'
import { Input } from './ui/input'
import { NativeSelect, NativeSelectOption } from './ui/native-select'

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

function monthName(month: number) {
  const locale = getLocale() === 'en' ? 'en-GB' : 'et-EE'
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2000, month - 1))
}

function DateParts({
  id,
  legend,
  parts,
  onChange,
  invalid,
  describedBy,
}: {
  id: string
  legend: string
  parts: PeriodParts
  onChange: (parts: PeriodParts) => void
  invalid: boolean
  describedBy: string
}) {
  const field = { 'aria-invalid': invalid || undefined, 'aria-describedby': describedBy }
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm leading-none font-medium">{legend}</legend>
      <div className="grid grid-cols-[4rem_minmax(0,1fr)_5.5rem] gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor={`${id}-day`}>
            {m.period_day()}
          </label>
          <Input
            id={`${id}-day`}
            inputMode="numeric"
            maxLength={2}
            value={parts.day}
            onChange={(event) => onChange({ ...parts, day: event.target.value })}
            {...field}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor={`${id}-month`}>
            {m.period_month()}
          </label>
          <NativeSelect
            id={`${id}-month`}
            value={parts.month}
            onChange={(event) => onChange({ ...parts, month: event.target.value })}
            {...field}
          >
            <NativeSelectOption value="">{m.period_month_none()}</NativeSelectOption>
            {MONTHS.map((month) => (
              <NativeSelectOption key={month} value={String(month)}>
                {monthName(month)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor={`${id}-year`}>
            {m.period_year()}
          </label>
          <Input
            id={`${id}-year`}
            inputMode="numeric"
            maxLength={4}
            value={parts.year}
            onChange={(event) => onChange({ ...parts, year: event.target.value })}
            {...field}
          />
        </div>
      </div>
    </fieldset>
  )
}

// A start and an end, each a day, month, and year with the day and month optional, and an
// Ongoing checkbox. Ticking Ongoing only disables the end; parsePeriodInput clears it on
// save, so unticking brings the typed end back.
export function PeriodInput({
  id,
  legend,
  value,
  onChange,
  errors = {},
}: {
  id: string
  legend: string
  value: PeriodInputValue
  onChange: (value: PeriodInputValue) => void
  errors?: { start?: PeriodError; end?: PeriodError }
}) {
  const hintId = `${id}-hint`
  const yearOnlyId = `${id}-year-only`
  const startErrorId = `${id}-start-error`
  const endErrorId = `${id}-end-error`
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">{legend}</legend>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <DateParts
            id={`${id}-start`}
            legend={m.period_start()}
            parts={value.start}
            onChange={(start) => onChange({ ...value, start })}
            invalid={errors.start !== undefined}
            describedBy={[hintId, yearOnlyId, errors.start && startErrorId]
              .filter(Boolean)
              .join(' ')}
          />
          {isYearOnly(value.start) && (
            <p id={yearOnlyId} className="text-muted-foreground text-sm">
              {m.period_year_only()}
            </p>
          )}
          {errors.start && (
            <p id={startErrorId} className="text-destructive text-sm">
              {periodErrorMessage(errors.start)}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <fieldset disabled={value.ongoing} className="disabled:[&_:is(legend,label)]:opacity-50">
            <DateParts
              id={`${id}-end`}
              legend={m.period_end()}
              parts={value.end}
              onChange={(end) => onChange({ ...value, end })}
              invalid={errors.end !== undefined}
              describedBy={[hintId, errors.end && endErrorId].filter(Boolean).join(' ')}
            />
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-foreground size-4 shrink-0 cursor-pointer rounded-[4px]"
              checked={value.ongoing}
              onChange={(event) => onChange({ ...value, ongoing: event.target.checked })}
            />
            {m.period_ongoing_label()}
          </label>
          {errors.end && (
            <p id={endErrorId} className="text-destructive text-sm">
              {periodErrorMessage(errors.end)}
            </p>
          )}
        </div>
      </div>
      <p id={hintId} className="text-muted-foreground text-sm">
        {m.period_parts_hint()}
      </p>
    </fieldset>
  )
}
