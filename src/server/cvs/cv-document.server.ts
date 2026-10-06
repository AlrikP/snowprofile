// The CV as a DOCX document (docs/product.md, "CV document"): one minimal built-in template,
// the same for both languages, built in code from the CV read. A team CV is one document
// with one shared table, so a shared project is listed once. Generated on request and
// never stored.
import {
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import type { Database } from '#/db'
import { type CvBlock, type Line, cvBlocks } from '#/lib/cv-table'
import { m } from '#/paraglide/messages.js'
import type { createAuth } from '../auth/better-auth.server'
import { AppError, type AppErrorCode } from '../errors'
import { resolveScope } from '../scope.server'
import type { Scope } from '../scope.server'
import { sessionUserId } from '../session.server'
import { type CvInput, readCvDocumentParams } from './cvs.schemas'
import { cv } from './cvs.server'

// A4 portrait with 1.5 cm margins leaves 10206 twips; the widths follow the columns, and
// the table's text is a point smaller than the rest (sizes are in half points).
const COLUMN_WIDTHS = [2150, 1400, 1250, 2700, 1600, 1106]
const MARGIN = 850
const TABLE_SIZE = 18
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: '999999' }
// The same colours as the HTML copy: a header row, and text in the other language.
const HEADER_FILL = 'F2F2F2'
const FALLBACK_FILL = 'FEF3C7'

function runs(line: Line, size?: number) {
  return line.map(
    (span) =>
      new TextRun({
        text: span.text,
        bold: span.bold,
        size,
        shading: span.fallback
          ? { type: ShadingType.CLEAR, color: 'auto', fill: FALLBACK_FILL }
          : undefined,
      }),
  )
}

// A cell the screen keeps on one line, such as a period, gets non-breaking hyphens, so Word
// breaks it only at its spaces and never inside a date.
function cell(lines: Line[], { fill, nowrap }: { fill?: string; nowrap?: boolean } = {}) {
  const kept = nowrap
    ? lines.map((line) =>
        line.map((span) => ({ ...span, text: span.text.replaceAll('-', '\u2011') })),
      )
    : lines
  return new TableCell({
    children:
      kept.length > 0
        ? kept.map((line) => new Paragraph({ children: runs(line, TABLE_SIZE) }))
        : [new Paragraph({})],
    shading: fill ? { type: ShadingType.CLEAR, color: 'auto', fill } : undefined,
  })
}

function table(block: Extract<CvBlock, { kind: 'table' }>) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: COLUMN_WIDTHS,
    borders: {
      top: BORDER,
      bottom: BORDER,
      left: BORDER,
      right: BORDER,
      insideHorizontal: BORDER,
      insideVertical: BORDER,
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: block.table.columns.map((column) =>
          cell([[{ text: column, bold: true }]], { fill: HEADER_FILL }),
        ),
      }),
      ...block.table.rows.map(
        (row) =>
          new TableRow({ children: row.map((each) => cell(each.lines, { nowrap: each.nowrap })) }),
      ),
    ],
  })
}

function content(blocks: CvBlock[], language: CvInput['language'], team: boolean) {
  return blocks.flatMap((block) => {
    if (block.kind === 'person') {
      return [
        new Paragraph({ heading: HeadingLevel.HEADING_1, text: block.name }),
        ...block.lines.map((line) => new Paragraph({ children: runs(line, TABLE_SIZE) })),
      ]
    }
    const heading = team
      ? [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            text: m.cv_projects({}, { locale: language }),
          }),
        ]
      : []
    return [...heading, table(block), new Paragraph({})]
  })
}

export async function cvDocument(
  db: Database,
  scope: Scope,
  input: CvInput,
  today = new Date().toISOString().slice(0, 10),
) {
  const read = await cv(db, scope, input, today)
  const team = read.people.length > 1
  const blocks = cvBlocks(read, 'combined')
  const name = team
    ? m.cv_document_team({}, { locale: read.language })
    : `CV ${read.people[0]?.fullName ?? ''}`.trim()
  const document = new Document({
    title: name,
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 20,
            language: { value: read.language === 'et' ? 'et-EE' : 'en-GB' },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } },
        },
        children: content(blocks, read.language, team),
      },
    ],
  })
  return { fileName: `${name} ${today}.docx`, buffer: await Packer.toBuffer(document) }
}

const STATUS: Record<AppErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID: 400,
}

// The download route's request: the CV the URL names (cvDocumentHref), for a signed-in
// member of its organization who may generate CVs, as an attachment.
export async function cvDocumentResponse(
  db: Database,
  auth: ReturnType<typeof createAuth>,
  request: Request,
  today?: string,
): Promise<Response> {
  const input = readCvDocumentParams(new URL(request.url).searchParams)
  if (!input.success) return new Response('Invalid CV selection.', { status: 400 })
  const { organizationId, ...selection } = input.output
  try {
    const userId = await sessionUserId(auth, request.headers)
    const scope = await resolveScope(db, userId, organizationId)
    const { fileName, buffer } = await cvDocument(db, scope, selection, today)
    // An ASCII name for old clients, and the real one, with its Estonian letters, for the rest.
    const ascii = fileName
      .normalize('NFD')
      .replace(/[^\x20-\x7e]/g, '')
      .replaceAll('"', '')
    return new Response(new Uint8Array(buffer), {
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'content-disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'cache-control': 'no-store',
      },
    })
  } catch (error) {
    if (error instanceof AppError)
      return new Response(error.message, { status: STATUS[error.code] })
    throw error
  }
}
