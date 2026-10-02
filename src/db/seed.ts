import { hashPassword } from 'better-auth/crypto'
import { and, eq, isNotNull } from 'drizzle-orm'
// Demo data for local and demo databases, and the data tests seed their throwaway databases
// with. `bun run db:seed` runs it; tests call seed(db) and name rows through seedIds.
// src/db/demo/generate.ts fills each organization.
import type { SQLiteInsertValue, SQLiteTable } from 'drizzle-orm/sqlite-core'
import type { Database, Executor } from '.'
import { SYSTEM_USER_ID, withActor } from './actor'
import {
  DEMO_NOW,
  type DemoOrganization,
  generateOrganization,
  type OrganizationSpec,
} from './demo/generate'
import * as schema from './schema'

// Every seeded user signs in with this password, in demo mode only (docs/architecture.md,
// "Sign-in modes").
export const SEED_PASSWORD = 'snowprofile-demo'

// The seed `bun run db:seed` uses; tests use it too, so they see the same data.
export const DEMO_SEED = 1

// Fixed UUIDv7-shaped ids, so tests can name seeded rows.
function id(n: number) {
  return `01900000-0000-7000-8000-${n.toString(16).padStart(12, '0')}`
}

export const seedIds = {
  users: { admin: id(0x101), employee: id(0x102) },
  orgs: { demo: id(0x201), rabasaare: id(0x202), tormilind: id(0x203) },
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

const [admin, employee] = seedUsers

function daysAgo(days: number) {
  return new Date(DEMO_NOW.getTime() - days * 24 * 60 * 60 * 1000)
}

// The demo organizations. The admin also belongs to a second one, so switching has data;
// the demo organization is the admin's first membership, so sign-in starts there.
export const demoOrganizations: readonly OrganizationSpec[] = [
  {
    id: seedIds.orgs.demo,
    slug: 'demo',
    name: 'Demo Software',
    createdAt: daysAgo(400),
    customers: 6,
    projects: 18,
    employees: 10,
    devMembers: [
      { ...admin, profile: true },
      { ...employee, profile: true },
    ],
  },
  {
    id: seedIds.orgs.rabasaare,
    slug: 'rabasaare',
    name: 'Rabasaare Digital',
    createdAt: daysAgo(300),
    customers: 4,
    projects: 10,
    employees: 6,
    devMembers: [{ ...admin, profile: false }],
  },
  {
    id: seedIds.orgs.tormilind,
    slug: 'tormilind',
    name: 'Tormilind Tech',
    createdAt: daysAgo(200),
    customers: 8,
    projects: 30,
    employees: 20,
    devMembers: [],
  },
]

export function generateDemoData(seed = DEMO_SEED): DemoOrganization[] {
  return demoOrganizations.map((spec) => generateOrganization(seed, spec))
}

function passwordAccount(userId: string, passwordHash: string, at: Date) {
  return {
    id: userId,
    userId,
    accountId: userId,
    providerId: 'credential',
    password: passwordHash,
    createdAt: at,
    updatedAt: at,
  }
}

// A user who signs in with a password, as Better Auth's credential provider stores one.
export async function addPasswordUser(
  db: Executor,
  person: { id: string; name: string; email: string },
  password = SEED_PASSWORD,
) {
  const now = new Date()
  await db
    .insert(schema.user)
    .values({ ...person, emailVerified: true, createdAt: now, updatedAt: now })
  await db
    .insert(schema.account)
    .values(passwordAccount(person.id, await hashPassword(password), now))
}

// SQLite limits the variables in one statement, so long lists go in slices. Users are never
// deleted (docs/architecture.md, "Audit and deletion"), so a reset finds its users still
// there and keeps them: existing rows are skipped.
async function insertAll<T extends SQLiteTable>(
  db: Executor,
  table: T,
  rows: SQLiteInsertValue<T>[],
  { skipExisting = false } = {},
) {
  for (let i = 0; i < rows.length; i += 100) {
    const insert = db.insert(table).values(rows.slice(i, i + 100))
    await (skipExisting ? insert.onConflictDoNothing() : insert)
  }
}

// In foreign-key order. Every generated user signs in with SEED_PASSWORD; one hash serves
// them all, since hashing is slow.
async function insertOrganization(db: Executor, data: DemoOrganization, passwordHash: string) {
  await db.insert(schema.organization).values(data.organization)
  await insertAll(db, schema.user, data.users, { skipExisting: true })
  await insertAll(
    db,
    schema.account,
    data.users.map((row) => passwordAccount(row.id, passwordHash, row.createdAt)),
    { skipExisting: true },
  )
  await insertAll(db, schema.member, data.members)
  await insertAll(db, schema.technologyCategory, data.technologyCategories)
  await insertAll(db, schema.technology, data.technologies)
  await insertAll(db, schema.tenderCriterion, data.tenderCriteria)
  await insertAll(db, schema.customer, data.customers)
  await insertAll(db, schema.contactPerson, data.contactPersons)
  await insertAll(db, schema.project, data.projects)
  await insertAll(db, schema.projectContact, data.projectContacts)
  await insertAll(db, schema.projectTechnology, data.projectTechnologies)
  await insertAll(db, schema.projectCriterionAnswer, data.projectCriterionAnswers)
  await insertAll(db, schema.employeeProfile, data.employeeProfiles)
  await insertAll(db, schema.education, data.educations)
  await insertAll(db, schema.participation, data.participations)
  await insertAll(db, schema.participationTechnology, data.participationTechnologies)
  await insertAll(db, schema.ownProject, data.ownProjects)
  await insertAll(db, schema.ownProjectTechnology, data.ownProjectTechnologies)
  await insertAll(db, schema.updateRequest, data.updateRequests)
}

// Everything the organization owns, children first, and the organization itself; its
// memberships and invitations cascade. Users stay.
async function deleteOrganization(db: Executor, organizationId: string) {
  const tables = [
    schema.projectContact,
    schema.projectTechnology,
    schema.projectCriterionAnswer,
    schema.participationTechnology,
    schema.ownProjectTechnology,
    schema.updateRequest,
    schema.participation,
    schema.ownProject,
    schema.education,
    schema.employeeProfile,
    schema.project,
    schema.contactPerson,
    schema.customer,
  ]
  for (const table of tables) {
    await db.delete(table).where(eq(table.organizationId, organizationId))
  }
  // Merged technologies point at the ones they were merged into, so they go first.
  await db
    .delete(schema.technology)
    .where(
      and(
        eq(schema.technology.organizationId, organizationId),
        isNotNull(schema.technology.mergedIntoId),
      ),
    )
  for (const table of [schema.technology, schema.technologyCategory, schema.tenderCriterion]) {
    await db.delete(table).where(eq(table.organizationId, organizationId))
  }
  await db.delete(schema.organization).where(eq(schema.organization.id, organizationId))
}

async function addSeedUsers(db: Executor, passwordHash: string) {
  const at = demoOrganizations[0]?.createdAt ?? DEMO_NOW
  await insertAll(
    db,
    schema.user,
    seedUsers.map((person) => ({
      id: person.id,
      name: person.name,
      email: person.email,
      emailVerified: true,
      createdAt: at,
      updatedAt: at,
    })),
    { skipExisting: true },
  )
  await insertAll(
    db,
    schema.account,
    seedUsers.map((person) => passwordAccount(person.id, passwordHash, at)),
    { skipExisting: true },
  )
}

// Adds the dev users and the demo organizations the database doesn't have yet. An
// organization that exists stays as it is, with whatever changes it has.
export async function seed(db: Database, seedValue = DEMO_SEED) {
  const passwordHash = await hashPassword(SEED_PASSWORD)
  const existing = new Set(
    (await db.select({ id: schema.organization.id }).from(schema.organization)).map(
      (row) => row.id,
    ),
  )
  const added: string[] = []
  const skipped: string[] = []
  await db.transaction((tx) =>
    withActor(SYSTEM_USER_ID, async () => {
      await addSeedUsers(tx, passwordHash)
      for (const spec of demoOrganizations) {
        if (existing.has(spec.id)) {
          skipped.push(spec.slug)
          continue
        }
        await insertOrganization(tx, generateOrganization(seedValue, spec), passwordHash)
        added.push(spec.slug)
      }
    }),
  )
  return { added, skipped }
}

// Replaces one demo organization's data with freshly generated rows, leaving the other
// organizations alone. Only the demo organizations' slugs are accepted.
export async function resetOrganization(db: Database, slug: string, seedValue = DEMO_SEED) {
  const spec = demoOrganizations.find((candidate) => candidate.slug === slug)
  if (!spec) {
    const slugs = demoOrganizations.map((candidate) => candidate.slug).join(', ')
    throw new Error(`No demo organization "${slug}". Demo organizations: ${slugs}.`)
  }
  const passwordHash = await hashPassword(SEED_PASSWORD)
  await db.transaction((tx) =>
    withActor(SYSTEM_USER_ID, async () => {
      await addSeedUsers(tx, passwordHash)
      await deleteOrganization(tx, spec.id)
      await insertOrganization(tx, generateOrganization(seedValue, spec), passwordHash)
    }),
  )
}
