// Periods as precise as they are known: a start and an end, each YYYY-MM-DD, YYYY-MM, or
// YYYY, and a null end while ongoing (docs/architecture.md, "Types"). Shared by the period
// input, the server schemas, and every view that shows a period.
import { m } from '#/paraglide/messages.js'
import { getLocale, type Locale } from '#/paraglide/runtime.js'

const PERIOD_DATE = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/

// Whether the value is a period date naming a day, month, or year that exists.
export function isPeriodDate(value: string): boolean {
  const match = PERIOD_DATE.exec(value)
  if (!match) return false
  const [, year, month, day] = match
  if (month === undefined) return true
  if (Number(month) < 1 || Number(month) > 12) return false
  if (day === undefined) return true
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  return date.getUTCMonth() === Number(month) - 1 && Number(day) >= 1
}

// The database's CHECK: the end compared at its own precision, so a 2024-03 start and a
// 2024 end are in order.
export function endsBeforeStart(startDate: string, endDate: string): boolean {
  return endDate < startDate.slice(0, endDate.length)
}

// -1, 0, or 1 as a comes before, overlaps, or follows b, compared at the coarser of the
// two precisions: 2024 and 2024-03 overlap.
function compareCoarse(a: string, b: string): number {
  const length = Math.min(a.length, b.length)
  const [left, right] = [a.slice(0, length), b.slice(0, length)]
  return left < right ? -1 : left > right ? 1 : 0
}

// Where a period breaks out of the one it must lie within, such as a participation's
// project (docs/product.md, "Participation periods"). An ongoing outer period has no end
// limit; an ongoing inner period needs an ongoing outer one.
export function outsidePeriod(
  period: { startDate: string; endDate: string | null },
  outer: { startDate: string; endDate: string | null },
): { start?: PeriodError; end?: PeriodError } {
  const errors: { start?: PeriodError; end?: PeriodError } = {}
  if (compareCoarse(period.startDate, outer.startDate) < 0) errors.start = 'before_outer_start'
  if (outer.endDate !== null) {
    if (period.endDate === null) errors.end = 'ongoing_after_outer_end'
    else if (compareCoarse(period.endDate, outer.endDate) > 0) errors.end = 'after_outer_end'
  }
  return errors
}

// The first day a period date can mean: 2024 is 2024-01-01, 2024-03 is 2024-03-01.
export function firstDay(value: string): string {
  if (value.length === 4) return `${value}-01-01`
  if (value.length === 7) return `${value}-01`
  return value
}

// The last day a period date can mean: 2024 is 2024-12-31, 2024-02 is 2024-02-29.
export function lastDay(value: string): string {
  if (value.length === 4) return `${value}-12-31`
  if (value.length === 7) {
    const [year, month] = value.split('-').map(Number)
    const last = new Date(Date.UTC(year ?? 0, month ?? 0, 0)).getUTCDate()
    return `${value}-${String(last).padStart(2, '0')}`
  }
  return value
}

// Whether a period overlaps a filter (docs/architecture.md, "Data conventions"): partial
// starts read as their first day, partial ends as their last, and an ongoing period runs
// to today. Either end of the filter may be open.
export function overlaps(
  period: { startDate: string; endDate: string | null },
  filter: { from: string | null; to: string | null },
  today: string,
): boolean {
  const end = period.endDate === null ? today : lastDay(period.endDate)
  if (filter.from !== null && end < firstDay(filter.from)) return false
  if (filter.to !== null && firstDay(period.startDate) > lastDay(filter.to)) return false
  return true
}

// DD-MM-YYYY, MM-YYYY, or YYYY.
export function formatPeriodDate(value: string): string {
  return value.split('-').reverse().join('-')
}

// "03-2024 – ongoing", "2019 – 06-2021", or one date when the period starts and ends on it.
export function formatPeriod(
  startDate: string,
  endDate: string | null,
  locale: Locale = getLocale(),
): string {
  if (endDate === startDate) return formatPeriodDate(startDate)
  const end = endDate === null ? m.period_ongoing({}, { locale }) : formatPeriodDate(endDate)
  return `${formatPeriodDate(startDate)} – ${end}`
}

// The period input's fields as typed. Day and year are text; month is '' or '1' to '12'.
export type PeriodParts = { day: string; month: string; year: string }

export type PeriodInputValue = { start: PeriodParts; end: PeriodParts; ongoing: boolean }

type PeriodDateError = 'year_required' | 'day_without_month' | 'invalid_date'

export type PeriodError =
  | PeriodDateError
  | 'end_before_start'
  | 'before_outer_start'
  | 'after_outer_end'
  | 'ongoing_after_outer_end'

const EMPTY_PARTS: PeriodParts = { day: '', month: '', year: '' }

function partsOf(value: string | null): PeriodParts {
  if (value === null) return EMPTY_PARTS
  const [year = '', month = '', day = ''] = value.split('-')
  return { day: day ? String(Number(day)) : '', month: month ? String(Number(month)) : '', year }
}

// The input's value for a stored period. A null end starts the input as ongoing, unless the
// start is empty too (a new record).
export function periodInputValue(
  startDate: string | null,
  endDate: string | null,
  { ongoing = startDate !== null && endDate === null } = {},
): PeriodInputValue {
  return { start: partsOf(startDate), end: partsOf(endDate), ongoing }
}

function isBlank(parts: PeriodParts) {
  return !parts.day.trim() && !parts.month && !parts.year.trim()
}

function pad(value: string) {
  return value.padStart(2, '0')
}

// One date from its parts: null when every part is empty.
function parsePeriodDate(
  parts: PeriodParts,
): { ok: true; value: string | null } | { ok: false; error: PeriodDateError } {
  if (isBlank(parts)) return { ok: true, value: null }
  const day = parts.day.trim()
  const year = parts.year.trim()
  if (!/^\d{4}$/.test(year)) return { ok: false, error: 'year_required' }
  if (day && !parts.month) return { ok: false, error: 'day_without_month' }
  if (day && !/^\d{1,2}$/.test(day)) return { ok: false, error: 'invalid_date' }
  const value = [year, parts.month && pad(parts.month), day && pad(day)].filter(Boolean).join('-')
  return isPeriodDate(value) ? { ok: true, value } : { ok: false, error: 'invalid_date' }
}

export type ParsedPeriod =
  | { ok: true; startDate: string | null; endDate: string | null }
  | { ok: false; start?: PeriodError; end?: PeriodError }

// The stored period for what the input holds. Ongoing clears the end, whatever its fields
// still hold: ticking Ongoing only disables them, so unticking brings them back.
export function parsePeriodInput(
  value: PeriodInputValue,
  { startRequired = true } = {},
): ParsedPeriod {
  const start = parsePeriodDate(value.start)
  const end = value.ongoing ? ({ ok: true, value: null } as const) : parsePeriodDate(value.end)
  if (!start.ok || !end.ok) {
    return {
      ok: false,
      start: start.ok ? undefined : start.error,
      end: end.ok ? undefined : end.error,
    }
  }
  // An end needs a start, even where the start is optional.
  if (start.value === null && (startRequired || end.value !== null)) {
    return { ok: false, start: 'year_required' }
  }
  if (start.value !== null && end.value !== null && endsBeforeStart(start.value, end.value)) {
    return { ok: false, end: 'end_before_start' }
  }
  return { ok: true, startDate: start.value, endDate: end.value }
}

// Whether a start is known only to the year, which reads as vague in a CV.
export function isYearOnly(parts: PeriodParts): boolean {
  return /^\d{4}$/.test(parts.year.trim()) && !parts.month
}

export function periodErrorMessage(error: PeriodError): string {
  switch (error) {
    case 'year_required':
      return m.period_year_required()
    case 'day_without_month':
      return m.period_day_without_month()
    case 'invalid_date':
      return m.period_invalid_date()
    case 'end_before_start':
      return m.period_end_before_start()
    case 'before_outer_start':
      return m.period_before_project_start()
    case 'after_outer_end':
      return m.period_after_project_end()
    case 'ongoing_after_outer_end':
      return m.period_ongoing_after_project_end()
  }
}

// A period date as typed: DD-MM-YYYY, MM-YYYY, or YYYY (dots or slashes work too), or null
// when it isn't one.
export function readPeriodDate(text: string): string | null {
  const parts = text.trim().split(/[-./]/).filter(Boolean)
  if (parts.length === 0 || parts.length > 3) return null
  const [year, month, day] = [...parts].reverse()
  if (!year || !/^\d{4}$/.test(year)) return null
  const value = [year, month?.padStart(2, '0'), day?.padStart(2, '0')]
    .filter((part) => part !== undefined)
    .join('-')
  return isPeriodDate(value) ? value : null
}
