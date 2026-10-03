// Seeds the database with demo data (src/db/seed.ts): adds the demo organizations it
// doesn't have yet and leaves existing ones as they are. With --reset <slug>, it replaces
// that one demo organization's data instead. Refuses anything but a local file database,
// an environment where DEMO_MODE is off, and a database that holds any organization that
// isn't a demo one (docs/architecture.md, "Sign-in modes").
//
// Usage: bun run db:seed                 (after bun run db:migrate)
//        bun run db:seed --reset demo

import { drizzle } from 'drizzle-orm/libsql'
import { parseArgs } from 'node:util'
import type { Database } from '#/db'
import { openClient } from '#/db/connection'
import { relations } from '#/db/relations'
import { SEED_PASSWORD, nonDemoOrganizations, resetOrganization, seed, seedUsers } from '#/db/seed'
import { demoModeOn } from '#/lib/demo-mode'

export function seedRefusal(source: Record<string, string | undefined>): string | null {
  if (!source.DATABASE_URL?.startsWith('file:')) {
    return `Refusing to seed ${source.DATABASE_URL ?? '(no DATABASE_URL)'}: local file databases only.`
  }
  if (!demoModeOn(source)) {
    return 'Refusing to seed with DEMO_MODE off. Set DEMO_MODE=true, or NODE_ENV=development.'
  }
  return null
}

export async function databaseRefusal(db: Database): Promise<string | null> {
  const others = await nonDemoOrganizations(db)
  if (others.length === 0) return null
  return `Refusing to seed a database with organizations that aren't demo ones: ${others.join(', ')}.`
}

if (import.meta.main) {
  const refusal = seedRefusal(process.env)
  if (refusal) {
    console.error(`[db-seed] ${refusal}`)
    process.exit(1)
  }

  const { values } = parseArgs({ options: { reset: { type: 'string' } } })
  const url = process.env.DATABASE_URL ?? ''
  const db = drizzle({ client: openClient({ url }), relations })
  const databaseRefused = await databaseRefusal(db)
  if (databaseRefused) {
    console.error(`[db-seed] ${databaseRefused}`)
    process.exit(1)
  }

  if (values.reset) {
    try {
      await resetOrganization(db, values.reset)
    } catch (error) {
      console.error(`[db-seed] ${error instanceof Error ? error.message : String(error)}`)
      process.exit(1)
    }
    console.log(`[db-seed] Reset ${values.reset} in ${url}.`)
  } else {
    const { added, skipped } = await seed(db)
    if (added.length > 0) console.log(`[db-seed] Added ${added.join(', ')} to ${url}.`)
    if (skipped.length > 0) {
      console.log(
        `[db-seed] Left ${skipped.join(', ')} as they are. To start one over: bun run db:seed --reset <slug>`,
      )
    }
  }
  const emails = seedUsers.map((person) => person.email).join(' or ')
  console.log(`[db-seed] Sign in as ${emails} with password "${SEED_PASSWORD}".`)
}
