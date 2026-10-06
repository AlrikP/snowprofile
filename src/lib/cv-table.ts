import { m } from '#/paraglide/messages.js'
import type { Cv, CvProject } from '#/server/cvs/cvs.functions'
// The CV as the page shows it, copies it, and downloads it (docs/product.md, "CV view" and
// "CV document"): each person's heading and details, and the projects as tables. One model
// feeds the screen, the HTML and plain-text copies, and the DOCX document, so they can't
// drift apart. The columns follow prototypes/cv.html and stay an open question ("CV table
// columns").
import { formatApproximateNumber } from './approximate-number'
import { formatDate } from './date-time'
import { firstDay, formatPeriod, lastDay } from './period'

type Language = Cv['language']
type Text = NonNullable<CvProject['description']>
type Part = CvProject['parts'][number]

// A run of text. A fallback is in the other language and is highlighted wherever the CV
// goes, so a pasted CV still shows what is untranslated.
type Span = { text: string; bold?: boolean; fallback?: { lang: Language } }
export type Line = Span[]
export type Cell = { lines: Line[]; nowrap?: boolean }
export type CvTable = { columns: string[]; rows: Cell[][] }

export type CvBlock =
  | { kind: 'person'; id: string; name: string; lines: Line[] }
  | { kind: 'table'; key: string; table: CvTable }

// A team CV shows a table per person, or one table with every person's part in it.
export type CvLayout = 'each' | 'combined'

function spans(value: Text | null, bold = false): Line[] {
  if (!value) return []
  const fallback = value.fallback ? { lang: value.lang } : undefined
  return value.text
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => [{ text: line, bold, fallback }])
}

// One line of the text, its line breaks read as spaces.
function inline(value: Text | null): Span[] {
  if (!value) return []
  return [
    {
      text: value.text.replace(/\s*\n\s*/g, ' '),
      fallback: value.fallback ? { lang: value.lang } : undefined,
    },
  ]
}

function joined(lines: Span[][], separator: string): Span[] {
  return lines.flatMap((line, index) => (index > 0 ? [{ text: separator }, ...line] : line))
}

function roles(part: Part): Span[] {
  return joined(
    part.roles.map((role) => inline(role).map((span) => ({ ...span, bold: true }))),
    ', ',
  )
}

function text(value: string): Cell {
  return { lines: value ? [[{ text: value }]] : [] }
}

function projectCell(project: CvProject): Cell {
  const name = project.employer ? `${project.name} (${project.employer})` : project.name
  return { lines: [[{ text: name, bold: true }], ...spans(project.description)] }
}

function technologies(parts: Part[]): Cell {
  return text([...new Set(parts.flatMap((part) => part.technologies))].join(', '))
}

function hours(part: Part, language: Language): string {
  return part.hours ? formatApproximateNumber(part.hours, 'hours', language) : ''
}

// The span of every part: the earliest start, and the latest end or ongoing.
function period(parts: Part[], language: Language): string {
  let start = parts[0]?.startDate ?? ''
  let end: string | null = parts[0]?.endDate ?? null
  for (const part of parts) {
    if (firstDay(part.startDate) < firstDay(start)) start = part.startDate
    if (end !== null && (part.endDate === null || lastDay(part.endDate) > lastDay(end))) {
      end = part.endDate
    }
  }
  return formatPeriod(start, end, language)
}

function columns(language: Language, combined: boolean): string[] {
  const locale = { locale: language }
  return [
    m.cv_col_project({}, locale),
    m.cv_col_customer({}, locale),
    m.cv_col_period({}, locale),
    combined ? m.cv_col_people({}, locale) : m.cv_col_role({}, locale),
    m.cv_col_hours({}, locale),
    m.cv_col_technologies({}, locale),
  ]
}

function personTable(cv: Cv, profileId: string): CvTable {
  const rows = cv.projects.flatMap((project) =>
    project.parts
      .filter((part) => part.profileId === profileId)
      .map((part) => [
        projectCell(project),
        text(project.customerName ?? ''),
        { ...text(formatPeriod(part.startDate, part.endDate, cv.language)), nowrap: true },
        { lines: [roles(part), ...spans(part.tasks)].filter((line) => line.length > 0) },
        { ...text(hours(part, cv.language)), nowrap: true },
        technologies([part]),
      ]),
  )
  return { columns: columns(cv.language, false), rows }
}

function combinedTable(cv: Cv): CvTable {
  const names = new Map(cv.people.map((person) => [person.id, person.fullName]))
  const rows = cv.projects.map((project) => {
    const many = project.parts.length > 1
    return [
      projectCell(project),
      text(project.customerName ?? ''),
      { ...text(period(project.parts, cv.language)), nowrap: true },
      {
        lines: project.parts.map((part) => {
          const tasks = inline(part.tasks)
          const role = roles(part)
          const what =
            role.length > 0 && tasks.length > 0
              ? [...role, { text: ' – ' }, ...tasks]
              : [...role, ...tasks]
          return [{ text: `${names.get(part.profileId) ?? ''}: ` }, ...what]
        }),
      },
      {
        lines: project.parts.flatMap((part) => {
          const value = hours(part, cv.language)
          if (!value) return []
          return [[{ text: many ? `${names.get(part.profileId) ?? ''}: ${value}` : value }]]
        }),
      },
      technologies(project.parts),
    ]
  })
  return { columns: columns(cv.language, true), rows }
}

function personBlock(cv: Cv, person: Cv['people'][number]): CvBlock {
  const locale = { locale: cv.language }
  const lines: Line[] = []
  if (person.birthDate) {
    lines.push([{ text: m.cv_born({ date: formatDate(person.birthDate, cv.language) }, locale) }])
  }
  for (const each of person.education) {
    const parts = [each.institution, each.field, each.degree].map(inline).filter((p) => p.length)
    const when = each.startDate ? formatPeriod(each.startDate, each.endDate, cv.language) : null
    lines.push([...joined(parts, ', '), ...(when ? [{ text: ` (${when})` }] : [])])
  }
  return { kind: 'person', id: person.id, name: person.fullName, lines }
}

export function cvBlocks(cv: Cv, layout: CvLayout): CvBlock[] {
  if (layout === 'combined' && cv.people.length > 1) {
    return [
      ...cv.people.map((person) => personBlock(cv, person)),
      { kind: 'table', key: 'combined', table: combinedTable(cv) },
    ]
  }
  return cv.people.flatMap((person) => {
    const table = personTable(cv, person.id)
    const block = personBlock(cv, person)
    return table.rows.length > 0 ? [block, { kind: 'table', key: person.id, table }] : [block]
  })
}

// Styles written inline: pasted HTML loses the page's stylesheet.
const CELL = 'border: 1px solid #999; padding: 4px 6px; text-align: left; vertical-align: top'
const HEADER = `${CELL}; background-color: #f2f2f2; font-weight: bold`
const FALLBACK = 'background-color: #fef3c7; color: #78350f'

function escape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function spanHtml(span: Span): string {
  let html = escape(span.text)
  if (span.bold) html = `<strong>${html}</strong>`
  if (span.fallback) html = `<span lang="${span.fallback.lang}" style="${FALLBACK}">${html}</span>`
  return html
}

function linesHtml(lines: Line[]): string {
  return lines.map((line) => line.map(spanHtml).join('')).join('<br>')
}

// The CV as HTML with inline styles, which Word, Google Docs, and spreadsheets paste as
// headings and tables.
export function cvHtml(blocks: CvBlock[], language: Language): string {
  const body = blocks.map((block) => {
    if (block.kind === 'person') {
      const details = block.lines.length > 0 ? `<p>${linesHtml(block.lines)}</p>` : ''
      return `<h3>${escape(block.name)}</h3>${details}`
    }
    const head = block.table.columns.map((column) => `<th style="${HEADER}">${escape(column)}</th>`)
    const rows = block.table.rows.map((row) => {
      const cells = row.map((cell) => {
        const style = cell.nowrap ? `${CELL}; white-space: nowrap` : CELL
        return `<td style="${style}">${linesHtml(cell.lines)}</td>`
      })
      return `<tr>${cells.join('')}</tr>`
    })
    return `<table style="border-collapse: collapse"><thead><tr>${head.join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`
  })
  return `<div lang="${language}">${body.join('')}</div>`
}

function lineText(line: Line): string {
  return line.map((span) => span.text).join('')
}

// A cell as a spreadsheet reads it from tab-separated text: quoted when it holds a line
// break, a tab, or a quote.
function cellText(cell: Cell): string {
  const value = cell.lines.map(lineText).join('\n')
  return /[\t\n"]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

// The CV as plain text: headings and details as lines, each table as tab-separated rows.
export function cvText(blocks: CvBlock[]): string {
  return blocks
    .map((block) => {
      if (block.kind === 'person') return [block.name, ...block.lines.map(lineText)].join('\n')
      return [block.table.columns, ...block.table.rows.map((row) => row.map(cellText))]
        .map((row) => row.join('\t'))
        .join('\n')
    })
    .join('\n\n')
}
