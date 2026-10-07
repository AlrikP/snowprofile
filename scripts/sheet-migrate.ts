// Loads Snowhound's CV sheet into an existing organization, as the system user, in one
// transaction (docs/architecture.md, "From the sheet"). Prints what it loaded and what it
// couldn't read, for an admin to fix in the app. A re-run updates what an earlier run
// loaded instead of duplicating it, so the migration can be rehearsed.
//
// Usage: bun run sheet:migrate <file.xlsx> <organization slug>
import { eq } from 'drizzle-orm'
import type { Database } from '#/db'
import { SYSTEM_USER_ID, withActor } from '#/db/actor'
import { openDatabase } from '#/db/connection'
import { organization } from '#/db/schema'
import { env } from '#/env'
import { loadProjects } from './sheet-migration/projects'
import { readWorkbook } from './sheet-migration/read'

export async function sheetMigrate(
  db: Database,
  databaseUrl: string,
  args: string[],
): Promise<{ ok: boolean; message: string }> {
  const [file, slug] = args
  if (args.length !== 2 || !file || !slug) {
    return { ok: false, message: 'Usage: bun run sheet:migrate <file.xlsx> <organization slug>' }
  }
  // The company stack's database is a file in its volume; anything else is a mistake.
  if (!databaseUrl.startsWith('file:')) {
    return { ok: false, message: 'DATABASE_URL must be a local SQLite file (file:...).' }
  }
  const [found] = await db
    .select({ id: organization.id, name: organization.name })
    .from(organization)
    .where(eq(organization.slug, slug))
  if (!found) {
    return {
      ok: false,
      message: `No organization ${slug}. Create it first with bun run org:create.`,
    }
  }

  const { projects, report } = await readWorkbook(file)
  const loaded = await withActor(SYSTEM_USER_ID, () =>
    db.transaction((tx) => loadProjects(tx, found.id, projects, report)),
  )
  return {
    ok: true,
    message: [
      `Loaded into ${found.name}:`,
      `  projects: ${loaded.projects.added} added, ${loaded.projects.updated} updated`,
      `  customers added: ${loaded.customers}, contact persons added: ${loaded.contacts}`,
      `  technologies added: ${loaded.technologies}, characteristics added: ${loaded.criteria}`,
      '',
      report.format(),
    ].join('\n'),
  }
}

if (import.meta.main) {
  const { ok, message } = await sheetMigrate(
    openDatabase(env.DATABASE_URL),
    env.DATABASE_URL,
    process.argv.slice(2),
  )
  for (const line of message.split('\n')) {
    ;(ok ? console.log : console.error)(`[sheet-migrate] ${line}`)
  }
  if (!ok) process.exit(1)
}
