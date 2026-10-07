// Reads the CV sheet and prints what the migration would load and what it can't read,
// without touching a database, so the sheet can be fixed before a migration.
//
// Usage: bun run sheet:report <file.xlsx>

import { readWorkbook } from './sheet-migration/read'

export async function sheetReport(input: string | Buffer): Promise<string> {
  const { projects, people, report } = await readWorkbook(input)
  const participations = people.reduce((sum, person) => sum + person.participations.length, 0)
  const ownProjects = people.reduce((sum, person) => sum + person.ownProjects.length, 0)
  return [
    `Read ${projects.length} projects and ${people.length} people, with ${participations} participations and ${ownProjects} own projects.`,
    report.format(),
  ].join('\n')
}

if (import.meta.main) {
  const [file] = process.argv.slice(2)
  if (!file) {
    console.error('[sheet-report] Usage: bun run sheet:report <file.xlsx>')
    process.exit(1)
  }
  console.log(await sheetReport(file))
}
