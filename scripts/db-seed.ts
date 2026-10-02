// Seeds the database with demo data (src/db/seed.ts). Refuses anything but a local file
// database, a production stack unless DEMO_MODE is on, and a database already seeded
// (docs/architecture.md, "Sign-in modes").
//
// Usage: bun run db:seed   (after bun run db:migrate)

import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/libsql'
import { relations } from '#/db/relations'
import { user } from '#/db/schema'
import { SEED_PASSWORD, seed, seedIds, seedUsers } from '#/db/seed'

export function seedRefusal(source: Record<string, string | undefined>): string | null {
  if (!source.DATABASE_URL?.startsWith('file:')) {
    return `Refusing to seed ${source.DATABASE_URL ?? '(no DATABASE_URL)'}: local file databases only.`
  }
  if (source.NODE_ENV === 'production' && source.DEMO_MODE !== 'true') {
    return 'Refusing to seed a production stack without DEMO_MODE=true.'
  }
  return null
}

if (import.meta.main) {
  const refusal = seedRefusal(process.env)
  if (refusal) {
    console.error(`[db-seed] ${refusal}`)
    process.exit(1)
  }

  const url = process.env.DATABASE_URL ?? ''
  const db = drizzle({ connection: { url }, relations })
  const [seeded] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, seedIds.users.admin))
  if (seeded) {
    console.error(
      `[db-seed] ${url} is already seeded. To start over: rm local.db && bun run db:migrate && bun run db:seed`,
    )
    process.exit(1)
  }

  await seed(db)
  const emails = seedUsers.map((person) => person.email).join(' or ')
  console.log(`[db-seed] Seeded ${url}. Sign in as ${emails} with password "${SEED_PASSWORD}".`)
}
