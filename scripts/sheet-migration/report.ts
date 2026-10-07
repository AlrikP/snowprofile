// What the migration couldn't read, for an admin to fix in the app: each value with its
// sheet, cell, and reason. The script prints it when it ends.
export type ReportEntry = { sheet: string; cell: string; value: string; reason: string }

export class Report {
  readonly entries: ReportEntry[] = []

  add(entry: ReportEntry) {
    this.entries.push(entry)
  }

  // One line per value, grouped by sheet in the order they were found.
  format(): string {
    if (this.entries.length === 0) return 'Every value was read.'
    const sheets = new Map<string, ReportEntry[]>()
    for (const entry of this.entries) {
      sheets.set(entry.sheet, [...(sheets.get(entry.sheet) ?? []), entry])
    }
    const lines = [`${this.entries.length} values weren't read:`]
    for (const [sheet, entries] of sheets) {
      lines.push('', sheet)
      for (const { cell, value, reason } of entries) {
        lines.push(`  ${cell.padEnd(5)} ${JSON.stringify(value)}: ${reason}`)
      }
    }
    return lines.join('\n')
  }
}
