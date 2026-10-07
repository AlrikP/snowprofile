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
import { catalogues } from './sheet-migration/catalogue'
import { loadPeople } from './sheet-migration/people'
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

  const { projects, people, report } = await readWorkbook(file)
  const { loadedProjects, loadedPeople, added } = await withActor(SYSTEM_USER_ID, () =>
    db.transaction(async (tx) => {
      const catalogue = await catalogues(tx, found.id)
      const loadedProjects = await loadProjects(tx, found.id, projects, catalogue, report)
      const loadedPeople = await loadPeople(tx, found.id, people, catalogue, report)
      return { loadedProjects, loadedPeople, added: catalogue.added }
    }),
  )
  function counted(counts: { added: number; updated: number }) {
    return `${counts.added} added, ${counts.updated} updated`
  }
  return {
    ok: true,
    message: [
      `Loaded into ${found.name}:`,
      `  projects: ${counted(loadedProjects.projects)}`,
      `  customers added: ${loadedProjects.customers}, contact persons added: ${loadedProjects.contacts}`,
      `  technologies added: ${added.technologies}, characteristics added: ${loadedProjects.criteria}`,
      `  people: ${counted(loadedPeople.profiles)}, of them ${loadedPeople.users} new users`,
      `  invitations created: ${loadedPeople.invitations}`,
      `  education: ${counted(loadedPeople.education)}`,
      `  participations: ${counted(loadedPeople.participations)}, roles added: ${added.roles}`,
      `  own projects: ${counted(loadedPeople.ownProjects)}`,
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
