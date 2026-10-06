import { ClipboardCopyIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader } from '#/components/ui/card'
import { m } from '#/paraglide/messages.js'
import type { Cv } from '#/server/cvs/cvs.functions'
import { type Cell, type CvLayout, type Line, cvBlocks, cvHtml, cvText } from './cv-table'

const BORDER = 'border-foreground/30 border px-2 py-1.5 text-left align-top'

function Lines({ lines }: { lines: Line[] }) {
  return lines.map((line, index) => (
    <span key={index}>
      {index > 0 && <br />}
      {line.map((span, spanIndex) => {
        const text = span.bold ? <strong>{span.text}</strong> : span.text
        if (!span.fallback) return <span key={spanIndex}>{text}</span>
        return (
          <span
            key={spanIndex}
            lang={span.fallback.lang}
            title={
              span.fallback.lang === 'et' ? m.translation_missing_en() : m.translation_missing_et()
            }
            className="bg-amber-100 text-amber-900"
          >
            {text}
          </span>
        )
      })}
    </span>
  ))
}

function TableCell({ cell }: { cell: Cell }) {
  return (
    <td className={`${BORDER} ${cell.nowrap ? 'whitespace-nowrap' : ''}`}>
      <Lines lines={cell.lines} />
    </td>
  )
}

// The CV as headings and tables, in its language, with a button that copies it so it
// pastes into Word, Google Docs, or a spreadsheet with its structure kept.
export function CvView({ cv, layout }: { cv: Cv; layout: CvLayout }) {
  const blocks = cvBlocks(cv, layout)
  const [status, setStatus] = useState('')

  async function copy() {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([cvHtml(blocks, cv.language)], { type: 'text/html' }),
          'text/plain': new Blob([cvText(blocks)], { type: 'text/plain' }),
        }),
      ])
      setStatus(m.cv_copied())
    } catch {
      setStatus(m.cv_copy_failed())
    }
  }

  return (
    <Card className="gap-4 py-5" role="region" aria-labelledby="cv-view-title">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3 px-5">
        <h2 id="cv-view-title" className="text-xl">
          {m.cv_preview()}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <p role="status" className="text-muted-foreground text-sm">
            {status}
          </p>
          <Button variant="outline" onClick={() => void copy()}>
            <ClipboardCopyIcon />
            {m.cv_copy()}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-5">
        <p className="rounded-md border border-dashed border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {m.cv_columns_provisional()}
        </p>
        {cv.projects.length === 0 && (
          <p className="text-muted-foreground text-sm">{m.cv_no_projects()}</p>
        )}
        <div className="flex flex-col gap-4" lang={cv.language}>
          {blocks.map((block) =>
            block.kind === 'person' ? (
              <div key={`person-${block.id}`} className="flex flex-col gap-1">
                <h3 className="font-sans text-lg font-semibold tracking-normal">{block.name}</h3>
                {block.lines.length > 0 && (
                  <p className="text-sm">
                    <Lines lines={block.lines} />
                  </p>
                )}
              </div>
            ) : (
              <div key={`table-${block.key}`} className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      {block.table.columns.map((column) => (
                        <th key={column} className={`${BORDER} bg-muted font-semibold`}>
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <TableCell key={cellIndex} cell={cell} />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ),
          )}
        </div>
      </CardContent>
    </Card>
  )
}
