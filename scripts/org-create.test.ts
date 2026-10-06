/// <reference types="bun" />

import { afterAll, beforeAll, expect, test } from 'bun:test'
import { asc, count, eq } from 'drizzle-orm'
import type { Database } from '#/db'
import { SYSTEM_USER_ID, withActor } from '#/db/actor'
import { invitation, member, organization, technologyCategory, user } from '#/db/schema'
import { createTestDatabase } from '#/db/testing'
import { acceptInvitation } from '#/server/invitations/invitations.server'
import { orgCreate } from './org-create'

let db: Database
let cleanup: () => void
const base = 'https://cv.example.com'
// The run that creates acme, which every test then finds.
let first: Awaited<ReturnType<typeof orgCreate>>

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase({ seeded: false }))
  first = await orgCreate(db, ['acme', ' Acme OÜ ', 'Admin@Acme.ee'], base)
})

afterAll(() => cleanup())

async function acme() {
  const [row] = await db.select().from(organization).where(eq(organization.slug, 'acme'))
  return row
}

async function counts() {
  const [orgs] = await db.select({ n: count() }).from(organization)
  const [invitations] = await db.select({ n: count() }).from(invitation)
  const [categories] = await db.select({ n: count() }).from(technologyCategory)
  return { orgs: orgs?.n, invitations: invitations?.n, categories: categories?.n }
}

test('organizations.created-by-script: creates the organization with its technology categories', async () => {
  expect(first.ok).toBe(true)
  expect(first.message).toStartWith('Created Acme OÜ at /acme.')
  const created = await acme()
  expect(created?.name).toBe('Acme OÜ')
  const categories = await db
    .select({
      nameEn: technologyCategory.nameEn,
      createdBy: technologyCategory.createdBy,
    })
    .from(technologyCategory)
    .where(eq(technologyCategory.organizationId, created?.id ?? ''))
    .orderBy(asc(technologyCategory.position))
  expect(categories.map((each) => each.nameEn)).toEqual([
    'Frontend',
    'Backend',
    'Data',
    'Infrastructure',
    'Testing',
    'Other',
  ])
  expect(categories.every((each) => each.createdBy === SYSTEM_USER_ID)).toBe(true)
})

test('organizations.first-admin-invited: prints a link that makes the invited person its admin', async () => {
  const created = await acme()
  const [sent] = await db
    .select()
    .from(invitation)
    .where(eq(invitation.organizationId, created?.id ?? ''))
  expect(sent).toMatchObject({
    email: 'admin@acme.ee',
    role: 'admin',
    status: 'pending',
    inviterId: SYSTEM_USER_ID,
  })

  const invitee = '01900000-0000-7000-8000-0000000acme'
  const now = new Date()
  await db.insert(user).values({
    id: invitee,
    name: 'Acme Admin',
    email: 'admin@acme.ee',
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })
  // As the app accepts it: signed in as the invitee, who makes the write.
  await withActor(invitee, () => acceptInvitation(db, invitee, { invitationId: sent?.id ?? '' }))
  const [membership] = await db
    .select({ role: member.role })
    .from(member)
    .where(eq(member.organizationId, created?.id ?? ''))
  expect(membership?.role).toBe('admin')
})

test('organizations.first-admin-invited: the link is on the app’s address', async () => {
  const run = await orgCreate(db, ['other-co', 'Other', 'boss@other.ee'], base)
  const [sent] = await db
    .select({ id: invitation.id })
    .from(invitation)
    .where(eq(invitation.email, 'boss@other.ee'))

  expect(run.message.split('\n').at(-1)).toBe(`${base}/invite/${sent?.id}`)
})

test('organizations.existing-slug-unchanged: a re-run for the same slug changes nothing', async () => {
  const before = await counts()
  const run = await orgCreate(db, ['acme', 'Renamed', 'someone@else.ee'], base)

  expect(run).toEqual({ ok: true, message: 'acme already exists; nothing changed.' })
  expect(await counts()).toEqual(before)
  expect((await acme())?.name).toBe('Acme OÜ')
})

test('refuses a reserved slug, a bad email, and missing arguments', async () => {
  const before = await counts()

  expect((await orgCreate(db, ['sign-in', 'X', 'a@b.ee'], base)).ok).toBe(false)
  expect((await orgCreate(db, ['Acme Two', 'X', 'a@b.ee'], base)).ok).toBe(false)
  expect((await orgCreate(db, ['acme-two', 'X', 'not-an-email'], base)).message).toBe(
    'Invalid email.',
  )
  expect((await orgCreate(db, ['acme-two'], base)).message).toStartWith('Usage:')
  expect(await counts()).toEqual(before)
})
