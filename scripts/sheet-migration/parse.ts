// Turns the sheet's cells into the app's types (docs/architecture.md, "From the sheet").
// Each parser returns a value or the reason it couldn't, which goes into the report. A cell
// is what read-excel-file returns with numbers kept as their exact text: a string, a Date
// for a cell formatted as a date, a boolean, or null.
import type { ApproximateNumber, Qualifier } from '#/lib/approximate-number'
import { normalizeName } from '#/lib/normalize-name'
import { endsBeforeStart, isPeriodDate } from '#/lib/period'

export type Cell = string | Date | boolean | null

export type Parsed<T> = { ok: true; value: T } | { ok: false; reason: string }

function ok<T>(value: T): Parsed<T> {
  return { ok: true, value }
}

function fail(reason: string): { ok: false; reason: string } {
  return { ok: false, reason }
}

// The cell as text, trimmed; a Date as its ISO day.
export function cellText(cell: Cell): string {
  if (cell === null) return ''
  if (cell instanceof Date) return cell.toISOString().slice(0, 10)
  return String(cell).trim()
}

const OPEN_ENDS = new Set(['jätkuv', 'kestab', '...', '…', '-', '–'])

const FIRST_YEAR = 1950
// The sheet is historical, so a later year is a typo the report should show.
const LAST_YEAR = new Date().getUTCFullYear()

function year(value: string): number | null {
  const number = Number(value)
  return Number.isInteger(number) && number >= FIRST_YEAR && number <= LAST_YEAR ? number : null
}

function pad(value: string | number) {
  return String(value).padStart(2, '0')
}

const NOT_A_DATE = 'Not a date: use a month and year (05.2020), a year, or "jätkuv".'

// A period date as the sheet writes it, at the precision it has: a cell formatted as a date
// (the sheet's dates are months), 05.2020, 6.2015, 10-2021, 2018, or 01.03.2022. A month
// typed as a number loses its trailing zeros (10.2020 is stored as 10.202, 03.2020 as 3.2,
// the same as 03.20), so a year shorter than four digits is reported, not guessed; the
// operator fixes the cell in the sheet.
export function parsePeriodDate(cell: Cell): Parsed<string> {
  if (cell instanceof Date) {
    const value = `${cell.getUTCFullYear()}-${pad(cell.getUTCMonth() + 1)}`
    return year(value.slice(0, 4)) ? ok(value) : fail(NOT_A_DATE)
  }
  const text = cellText(cell)
  const yearOnly = /^(\d{4})(?:\.0+)?$/.exec(text)
  if (yearOnly?.[1]) return year(yearOnly[1]) ? ok(yearOnly[1]) : fail(NOT_A_DATE)
  const monthYear = /^(\d{1,2})[.\-/](\d{4})$/.exec(text)
  if (monthYear?.[1] && monthYear[2]) {
    const value = `${monthYear[2]}-${pad(monthYear[1])}`
    return year(monthYear[2]) && isPeriodDate(value) ? ok(value) : fail(NOT_A_DATE)
  }
  const day = parseDay(text)
  if (day) return ok(day)
  return fail(NOT_A_DATE)
}

// dd.mm.yyyy, dd/mm/yyyy, or dd.mm.yy, as YYYY-MM-DD; null for anything else.
function parseDay(text: string, today = new Date()): string | null {
  const match = /^(\d{1,2})[./](\d{1,2})[./](\d{2}|\d{4})$/.exec(text)
  if (!match?.[1] || !match[2] || !match[3]) return null
  let fullYear = match[3]
  if (fullYear.length === 2) {
    // A two-digit year is in this century unless that would be in the future.
    const century = Number(fullYear) > today.getUTCFullYear() % 100 ? 1900 : 2000
    fullYear = String(century + Number(fullYear))
  }
  const value = `${fullYear}-${pad(match[2])}-${pad(match[1])}`
  return year(fullYear) && isPeriodDate(value) ? value : null
}

// A period from its start and end cells. An empty end, or "jätkuv", "...", or "-", is
// ongoing.
export function parsePeriod(
  start: Cell,
  end: Cell,
): Parsed<{ startDate: string; endDate: string | null }> {
  if (cellText(start) === '') return fail('No start date.')
  const from = parsePeriodDate(start)
  if (!from.ok) return from
  const endText = cellText(end).toLowerCase()
  if (endText === '' || OPEN_ENDS.has(endText)) return ok({ startDate: from.value, endDate: null })
  const to = parsePeriodDate(end)
  if (!to.ok) return to
  if (endsBeforeStart(from.value, to.value)) return fail('The end is before the start.')
  return ok({ startDate: from.value, endDate: to.value })
}

// An education period written in one cell: 2017-2020, 1997 - 2003, or 2019- while studying.
export function parseYearRange(cell: Cell): Parsed<{ startDate: string; endDate: string | null }> {
  const match = /^(\d{4})\s*[-–]\s*(\d{4})?$/.exec(cellText(cell))
  if (!match?.[1] || !year(match[1]) || (match[2] && !year(match[2]))) {
    return fail('Not a period: use two years, 2017-2020, or 2019- while ongoing.')
  }
  if (match[2] && match[2] < match[1]) return fail('The end is before the start.')
  return ok({ startDate: match[1], endDate: match[2] ?? null })
}

// A calendar date: a birth date as dd.mm.yyyy, or a join date, which the sheet often has
// only as a month; a month becomes its first day.
export function parseCalendarDate(cell: Cell): Parsed<string> {
  if (cell instanceof Date) {
    const value = cell.toISOString().slice(0, 10)
    return year(value.slice(0, 4)) ? ok(value) : fail('Not a date: use dd.mm.yyyy.')
  }
  const day = parseDay(cellText(cell))
  if (day) return ok(day)
  const month = parsePeriodDate(cell)
  if (month.ok && month.value.length === 7) return ok(`${month.value}-01`)
  return fail('Not a date: use dd.mm.yyyy.')
}

const AMOUNT =
  /^(~|>|üle|umbes|u\.)?\s*(\d[\d\s ]*(?:[.,]\d+)?)\s*(\+)?\s*(h|tundi|töötundi|töötunni|€|eur)?\.?$/

// An approximate number: ~3500h, > 10 000h, 3350+, üle 10 000 töötunni, > 700 000€, or a
// plain number, which is exact unless it has a fraction.
export function parseApproximate(cell: Cell): Parsed<ApproximateNumber> {
  const text = cellText(cell).toLowerCase()
  const match = AMOUNT.exec(text)
  if (!match?.[2]) return fail('Not a number: use 3500, ~3500, or > 3500, with nothing else.')
  const number = Number(match[2].replace(/[\s ]/g, '').replace(',', '.'))
  if (!Number.isFinite(number)) return fail('Not a number: use 3500, ~3500, or > 3500.')
  let qualifier: Qualifier = 'exact'
  if (match[1] === '~' || match[1] === 'umbes' || match[1] === 'u.') qualifier = 'approximately'
  if (match[1] === '>' || match[1] === 'üle' || match[3] === '+') qualifier = 'more_than'
  if (!Number.isInteger(number) && qualifier === 'exact') qualifier = 'approximately'
  return ok({ value: Math.round(number), qualifier })
}

// How an employee sheet names a project: the Projektid sheet's number (10, Projekt8,
// Projekt 19), or the project's name, normalized as the catalogue compares names.
export type ProjectRef = { number: number } | { name: string; normalizedName: string }

export function parseProjectRef(cell: Cell): Parsed<ProjectRef> {
  if (cell instanceof Date) return fail('A date, not a project number or name.')
  const text = cellText(cell)
  const number = /^(?:projekt\s*)?(\d+)(?:\.0+)?$/i.exec(text)
  if (number?.[1]) return ok({ number: Number(number[1]) })
  const normalizedName = normalizeName(text)
  if (!normalizedName) return fail('No project number or name.')
  return ok({ name: text, normalizedName })
}

// A technology as the sheet lists it, with the category its line names, if any.
export type SheetTechnology = { name: string; category: string | null }

// A word after a name that says what it was used for, in English or Estonian: Oracle
// backend, RabbitMQ liidestus (integration), aranea raamistik (framework).
const DESCRIPTOR = /\s+(?:backend|frontend|liidestus|kasutajaliides|raamistik)$/i

// At most this many words in a name; more reads as a sentence, which goes to the report.
const MAX_TECHNOLOGY_WORDS = 3

// Free text to technology names: commas, "+", and "ja" separate them; a line may start
// with a category ("Frontend: React, ..."). A version at the end is dropped (Java 21,
// Java 8 - 21), and so is a word saying what it was used for (Oracle backend), so the
// names match the catalogue's. Fragments too long to be a name come back as rejected.
export function parseTechnologies(cell: Cell): {
  technologies: SheetTechnology[]
  rejected: string[]
} {
  const technologies: SheetTechnology[] = []
  const rejected: string[] = []
  const seen = new Set<string>()
  for (const line of cellText(cell).split(/\n+/)) {
    const prefixed = /^([^:,]{1,30}):\s*(.*)$/.exec(line.trim())
    const category = prefixed?.[1]?.trim() ?? null
    const list = prefixed ? (prefixed[2] ?? '') : line
    for (const part of list.split(/,|\s\+\s|\s+ja\s+|;/)) {
      const name = part
        .trim()
        .replace(/\.$/, '')
        .replace(DESCRIPTOR, '')
        .replace(/\s+\d[\d.]*(?:\s*[-–]\s*\d[\d.]*)?$/, '')
        .trim()
      if (!name) continue
      if (name.split(/\s+/).length > MAX_TECHNOLOGY_WORDS) {
        rejected.push(name)
        continue
      }
      const key = normalizeName(name)
      if (!key || seen.has(key)) continue
      seen.add(key)
      technologies.push({ name, category })
    }
  }
  return { technologies, rejected }
}

// Roles as the sheet writes them: "Arhitekt, team lead", "Tehniline analüütik / arhitekt".
export function parseRoles(cell: Cell): string[] {
  return cellText(cell)
    .split(/[,/]/)
    .map((role) => role.trim())
    .filter((role) => role !== '')
}
