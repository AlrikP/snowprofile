// Reads Snowhound_CV_baas.xlsx into projects and people, reporting what it can't parse.
// Every sheet is vertical: labels in column A, and one project, participation, or own
// project per column from B on. Rows are found by their label, not their position, so a
// row added to a sheet (the company email) doesn't shift the others.
//
// The Projektid sheet holds the organization's projects, numbered in row 1 ("Projekt12").
// Each other sheet, except the blank "Töötaja template", is one employee: the profile in
// column B, then their participations, then, below a "TEMPLATE" row, their own projects.
// The personal ID code row is never read.
import readXlsxFile from 'read-excel-file/node'
import type { ApproximateNumber } from '#/lib/approximate-number'
import {
  type Cell,
  cellText,
  type Parsed,
  parseApproximate,
  parseCalendarDate,
  parsePeriod,
  parseProjectRef,
  parseRoles,
  parseTechnologies,
  parseYearRange,
  type ProjectRef,
  type SheetTechnology,
} from './parse'
import { Report } from './report'

const PROJECTS_SHEET = 'Projektid'
const TEMPLATE_SHEET = 'Töötaja template'

type Period = { startDate: string; endDate: string | null }

// A yes/no criterion as the sheet labels it, and the answer as written ("Jah", "REST").
export type SheetAnswer = { criterion: string; answer: string }

export type SheetProject = {
  // The sheet's project number, which employee sheets refer to.
  number: number
  // Its header cell ("B1"), for the report.
  cell: string
  name: string
  description: string | null
  period: Period | null
  customer: string | null
  tenderReference: string | null
  // As written: a name with an email or phone, for the import to split.
  contact: string | null
  totalHours: ApproximateNumber | null
  cost: ApproximateNumber | null
  technologies: SheetTechnology[]
  answers: SheetAnswer[]
}

type SheetParticipation = {
  // The project reference's cell ("B12"), for the report.
  cell: string
  project: ProjectRef
  period: Period | null
  roles: string[]
  hours: ApproximateNumber | null
  tasks: string | null
}

type SheetOwnProject = {
  // The name's cell, for the report.
  cell: string
  name: string
  description: string | null
  period: Period | null
  customer: string | null
  tenderReference: string | null
  contact: string | null
  totalHours: ApproximateNumber | null
  // The person's own hours, when the size cell says "Isiklikult ~400".
  hours: ApproximateNumber | null
  technologies: SheetTechnology[]
  answers: SheetAnswer[]
}

type SheetEducation = {
  institution: string
  field: string | null
  degree: string | null
  period: Period | null
}

export type SheetPerson = {
  sheet: string
  fullName: string
  // The company email, lowercased: how a re-run and the first sign-in find the person.
  email: string | null
  birthDate: string | null
  joinDate: string | null
  education: SheetEducation[]
  participations: SheetParticipation[]
  ownProjects: SheetOwnProject[]
}

export type Workbook = { projects: SheetProject[]; people: SheetPerson[]; report: Report }

function columnName(index: number): string {
  let name = ''
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name
  }
  return name
}

function normalizeLabel(cell: Cell): string {
  return cellText(cell).toLowerCase().replace(/\s+/g, ' ').replace(/:$/, '').trim()
}

// One sheet's cells, with lookups by label and a report of what didn't parse.
class Grid {
  private readonly labels: string[]
  readonly width: number

  constructor(
    readonly sheet: string,
    private readonly rows: Cell[][],
    private readonly report: Report,
  ) {
    this.labels = rows.map((row) => normalizeLabel(row[0] ?? null))
    this.width = Math.max(0, ...rows.map((row) => row.length))
  }

  // The first row at or after `from` whose label passes the test, or -1.
  row(test: (label: string) => boolean, from = 0): number {
    const index = this.labels.slice(from).findIndex(test)
    return index === -1 ? -1 : from + index
  }

  cell(row: number, column: number): Cell {
    return row === -1 ? null : (this.rows[row]?.[column] ?? null)
  }

  text(row: number, column: number): string | null {
    return cellText(this.cell(row, column)) || null
  }

  label(row: number): string {
    return cellText(this.rows[row]?.[0] ?? null)
  }

  rowCount() {
    return this.rows.length
  }

  // The parsed value, or null with the cell in the report.
  take<T>(row: number, column: number, parsed: Parsed<T>): T | null {
    if (parsed.ok) return parsed.value
    this.flag(row, column, parsed.reason)
    return null
  }

  flag(row: number, column: number, reason: string) {
    this.report.add({
      sheet: this.sheet,
      cell: `${columnName(column)}${row + 1}`,
      value: cellText(this.cell(row, column)),
      reason,
    })
  }

  // The parsed value of an optional cell: null when it's empty.
  optional<T>(row: number, column: number, parse: (cell: Cell) => Parsed<T>): T | null {
    const cell = this.cell(row, column)
    return cellText(cell) === '' ? null : this.take(row, column, parse(cell))
  }
}

function startsWith(prefix: string) {
  return (label: string) => label.startsWith(prefix)
}

function is(label: string) {
  return (each: string) => each === label
}

function technologies(grid: Grid, row: number, column: number): SheetTechnology[] {
  const parsed = parseTechnologies(grid.cell(row, column))
  for (const fragment of parsed.rejected) {
    grid.flag(row, column, `"${fragment}" is too long for a technology name; add it in the app.`)
  }
  return parsed.technologies
}

// The yes/no criteria: every labelled row after "Jah/ei küsimused", with its answer.
function answers(grid: Grid, from: number, column: number): SheetAnswer[] {
  if (from === -1) return []
  const found: SheetAnswer[] = []
  for (let row = from + 1; row < grid.rowCount(); row++) {
    const criterion = grid.label(row)
    const answer = grid.text(row, column)
    if (criterion && answer) found.push({ criterion, answer })
  }
  return found
}

function period(grid: Grid, startRow: number, endRow: number, column: number): Period | null {
  const start = grid.cell(startRow, column)
  const end = grid.cell(endRow, column)
  // Projects, participations, and own projects all need a start.
  if (cellText(start) === '' && cellText(end) === '') {
    grid.flag(startRow, column, 'No start date.')
    return null
  }
  const parsed = parsePeriod(start, end)
  if (parsed.ok) return parsed.value
  // The report names the cell the problem is in.
  const inEnd = cellText(start) !== '' && parsePeriod(start, null).ok
  grid.flag(inEnd ? endRow : startRow, column, parsed.reason)
  return null
}

function readProjects(grid: Grid): SheetProject[] {
  const rows = {
    name: grid.row(startsWith('projekti nimi')),
    description: grid.row(startsWith('lühikirjeldus')),
    start: grid.row(startsWith('algusaeg')),
    end: grid.row(startsWith('lõpuaeg')),
    customer: grid.row(startsWith('tellija')),
    reference: grid.row(startsWith('viitenumber')),
    contact: grid.row(startsWith('kontaktisik')),
    hours: grid.row(startsWith('projekti arendusmaht')),
    cost: grid.row(startsWith('projekti maksumus')),
    technologies: grid.row(startsWith('kõikvõimalikud kasutatud tehnoloogiad')),
    answers: grid.row(startsWith('jah/ei')),
  }
  const projects: SheetProject[] = []
  for (let column = 1; column < grid.width; column++) {
    if (!grid.text(0, column)) continue
    const ref = grid.take(0, column, parseProjectRef(grid.cell(0, column)))
    if (ref === null) continue
    if (!('number' in ref)) {
      grid.flag(0, column, 'Not a project number: use Projekt and a number.')
      continue
    }
    const name = grid.text(rows.name, column)
    if (!name) {
      grid.flag(rows.name, column, 'A project needs a name.')
      continue
    }
    projects.push({
      number: ref.number,
      cell: `${columnName(column)}1`,
      name,
      description: grid.text(rows.description, column),
      period: period(grid, rows.start, rows.end, column),
      customer: grid.text(rows.customer, column),
      tenderReference: grid.text(rows.reference, column)?.replace(/\.0+$/, '') ?? null,
      contact: grid.text(rows.contact, column),
      totalHours: grid.optional(rows.hours, column, parseApproximate),
      cost: grid.optional(rows.cost, column, parseApproximate),
      technologies: technologies(grid, rows.technologies, column),
      answers: answers(grid, rows.answers, column),
    })
  }
  return projects
}

// An own project's size: the project's hours, the person's ("Isiklikult ~400"), or both
// (">15000. Isiklikult >1000").
function ownProjectSize(grid: Grid, row: number, column: number) {
  const text = grid.text(row, column)
  if (!text) return { totalHours: null, hours: null }
  const split = /^(.*?)[.,]?\s*isiklikult\s*(.*)$/i.exec(text)
  if (!split) return { totalHours: grid.take(row, column, parseApproximate(text)), hours: null }
  const total = split[1]?.trim() ?? ''
  return {
    totalHours: total ? grid.take(row, column, parseApproximate(total)) : null,
    hours: grid.take(row, column, parseApproximate(split[2]?.trim() ?? '')),
  }
}

function readPerson(grid: Grid): SheetPerson | null {
  const nameRow = grid.row(is('nimi'))
  const fullName = grid.text(nameRow, 1)
  if (!fullName) {
    grid.flag(Math.max(nameRow, 0), 1, 'No name in "Nimi:"; the sheet was skipped.')
    return null
  }
  const emailRow = grid.row((label) => ['e-post', 'email', 'e-mail'].includes(label))
  const email = grid.text(emailRow, 1)?.toLowerCase() ?? null
  if (!email) {
    grid.flag(
      Math.max(emailRow, nameRow),
      1,
      'No company email: add an "E-post:" row under "Nimi:".',
    )
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    grid.flag(emailRow, 1, 'Not an email address.')
  }

  const education = {
    institution: grid.row(startsWith('haridusasutus')),
    field: grid.row(startsWith('õppesuund')),
    period: grid.row(startsWith('õppeperiood')),
    degree: grid.row(startsWith('omandatud kraad')),
  }
  const work = {
    names: grid.row(is('projektid')),
    ref: grid.row(startsWith('projekti nr')),
    start: grid.row(startsWith('töötaja algusaeg')),
    end: grid.row(startsWith('töötaja lõpuaeg')),
    roles: grid.row(is('roll')),
    hours: grid.row(startsWith('rolli umbkaudne maht')),
    tasks: grid.row(startsWith('peamised ülesanded')),
  }
  const ownFrom = grid.row(startsWith('template'))
  const own = {
    name: grid.row(startsWith('projekti nimi'), ownFrom),
    description: grid.row(startsWith('lühikirjeldus'), ownFrom),
    start: grid.row(startsWith('algusaeg'), ownFrom),
    end: grid.row(startsWith('lõpuaeg'), ownFrom),
    customer: grid.row(startsWith('tellija'), ownFrom),
    reference: grid.row(startsWith('viitenumber'), ownFrom),
    contact: grid.row(startsWith('kontaktisik'), ownFrom),
    size: grid.row(startsWith('projekti arendusmaht'), ownFrom),
    technologies: grid.row(startsWith('kõikvõimalikud kasutatud tehnoloogiad'), ownFrom),
    answers: grid.row(startsWith('jah/ei'), ownFrom),
  }

  const person: SheetPerson = {
    sheet: grid.sheet,
    fullName,
    email: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
    birthDate: grid.optional(grid.row(startsWith('sünniaeg')), 1, parseCalendarDate),
    joinDate: grid.optional(grid.row(startsWith('liitusin')), 1, parseCalendarDate),
    education: [],
    participations: [],
    ownProjects: [],
  }

  for (let column = 1; column < grid.width; column++) {
    const institution = grid.text(education.institution, column)
    if (institution) {
      person.education.push({
        institution,
        field: grid.text(education.field, column),
        degree: grid.text(education.degree, column),
        period: grid.optional(education.period, column, parseYearRange),
      })
    }

    const used = Object.values(work).some((row) => grid.text(row, column) !== null)
    if (used) {
      const refRow = grid.text(work.ref, column) ? work.ref : work.names
      if (!grid.text(refRow, column)) {
        grid.flag(work.ref, column, 'No project number or name; the participation was skipped.')
      } else {
        const project = grid.take(refRow, column, parseProjectRef(grid.cell(refRow, column)))
        if (project) {
          person.participations.push({
            cell: `${columnName(column)}${refRow + 1}`,
            project,
            period: period(grid, work.start, work.end, column),
            roles: parseRoles(grid.cell(work.roles, column)),
            hours: grid.optional(work.hours, column, parseApproximate),
            tasks: grid.text(work.tasks, column),
          })
        }
      }
    }

    const ownName = ownFrom === -1 ? null : grid.text(own.name, column)
    if (ownName) {
      person.ownProjects.push({
        cell: `${columnName(column)}${own.name + 1}`,
        name: ownName,
        description: grid.text(own.description, column),
        period: period(grid, own.start, own.end, column),
        customer: grid.text(own.customer, column),
        tenderReference: grid.text(own.reference, column)?.replace(/\.0+$/, '') ?? null,
        contact: grid.text(own.contact, column),
        ...ownProjectSize(grid, own.size, column),
        technologies: technologies(grid, own.technologies, column),
        answers: answers(grid, own.answers, column),
      })
    }
  }
  return person
}

// The workbook as a path or its bytes.
export async function readWorkbook(input: string | Buffer): Promise<Workbook> {
  // Numbers stay text, so 10.2021 doesn't lose its trailing digits.
  const sheets = await readXlsxFile(input, { parseNumber: (text) => text })
  const report = new Report()
  const projects: SheetProject[] = []
  const people: SheetPerson[] = []
  for (const { sheet, data } of sheets) {
    const grid = new Grid(sheet, data as Cell[][], report)
    if (sheet.trim() === PROJECTS_SHEET) projects.push(...readProjects(grid))
    else if (sheet.trim() !== TEMPLATE_SHEET) {
      const person = readPerson(grid)
      if (person) people.push(person)
    }
  }
  return { projects, people, report }
}
