// Demo data for local and demo databases, and the fixtures tests seed their throwaway
// databases with. `bun run db:seed` runs it; tests call seed(db) and name rows through
// seedIds. Task 008 extends it with projects, people, and participations.
import { hashPassword } from 'better-auth/crypto'
import type { Database, Executor } from '.'
import { account, member, organization, user } from './schema'

// Every seeded user signs in with this password, in demo mode only (docs/architecture.md,
// "Sign-in modes").
export const SEED_PASSWORD = 'snowprofile-demo'

// Fixed UUIDv7-shaped ids, so tests can name seeded rows.
function id(n: number) {
  return `01900000-0000-7000-8000-${n.toString(16).padStart(12, '0')}`
}

export const seedIds = {
  users: { admin: id(0x101), employee: id(0x102) },
  orgs: { demo: id(0x201) },
} as const

// The sign-in page lists these in demo mode.
export const seedUsers = [
  { id: seedIds.users.admin, name: 'Anna Admin', email: 'admin@demo.example.com', role: 'admin' },
  {
    id: seedIds.users.employee,
    name: 'Erik Employee',
    email: 'employee@demo.example.com',
    role: 'employee',
  },
] as const

// A user who signs in with a password, as Better Auth's credential provider stores one.
export async function addPasswordUser(
  db: Executor,
  person: { id: string; name: string; email: string },
  password = SEED_PASSWORD,
) {
  const now = new Date()
  await db.insert(user).values({ ...person, emailVerified: true, createdAt: now, updatedAt: now })
  await db.insert(account).values({
    id: person.id,
    userId: person.id,
    accountId: person.id,
    providerId: 'credential',
    password: await hashPassword(password),
    createdAt: now,
    updatedAt: now,
  })
}

export async function seed(db: Database) {
  const now = new Date()
  await db.transaction(async (tx) => {
    await tx.insert(organization).values({
      id: seedIds.orgs.demo,
      name: 'Demo Software',
      slug: 'demo',
      createdAt: now,
    })
    for (const person of seedUsers) {
      await addPasswordUser(tx, person)
      await tx.insert(member).values({
        id: person.id,
        organizationId: seedIds.orgs.demo,
        userId: person.id,
        role: person.role,
        createdAt: now,
      })
    }
  })
}
