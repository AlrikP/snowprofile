/// <reference types="bun" />

import { afterAll, beforeAll, expect, test } from 'bun:test'
import { v7 as uuidv7 } from 'uuid'
import type { Database } from '#/db'
import { addPasswordUser } from '#/db/seed'
import { createTestDatabase } from '#/db/testing'
import { createAuth } from './better-auth.server'

let db: Database
let cleanup: () => void
let auth: ReturnType<typeof createAuth>

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase())
  auth = createAuth(db, { DEMO_MODE: true, ALLOWED_LOGIN_DOMAINS: [] })
})

afterAll(() => cleanup())

// Password accounts exist only in seeded data, so tests add users the way the seed does.
async function signUp(name: string) {
  const email = `${name}@example.com`
  await addPasswordUser(db, { id: uuidv7(), name, email }, 'correct-horse-battery')
  const response = await auth.api.signInEmail({
    body: { email, password: 'correct-horse-battery' },
    asResponse: true,
  })
  const headers = new Headers({ cookie: response.headers.get('set-cookie') ?? '' })
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error(`no session for ${name}`)
  return { userId: session.user.id, headers }
}

// Organizations are created by platform operators, so through the server API with a userId.
async function createOrganization(slug: string, adminId: string) {
  const created = await auth.api.createOrganization({
    body: { name: slug, slug, userId: adminId },
  })
  if (!created) throw new Error(`no organization ${slug}`)
  return created.id
}

async function can(headers: Headers, organizationId: string, permissions: object) {
  const result = await auth.api.hasPermission({
    headers,
    body: { organizationId, permissions },
  })
  return result.success
}

test('organizations and sessions get UUIDv7 ids', async () => {
  const { userId, headers } = await signUp('ids')
  const organizationId = await createOrganization('ids-org', userId)
  const session = await auth.api.getSession({ headers })
  expect(organizationId).toMatch(UUID_V7)
  expect(session?.session.id).toMatch(UUID_V7)
})

test('a user cannot create an organization on their own', async () => {
  const { headers } = await signUp('self-service')
  const error = await auth.api
    .createOrganization({ headers, body: { name: 'Mine', slug: 'mine' } })
    .then(
      () => null,
      (reason: unknown) => reason,
    )
  expect(error).toBeInstanceOf(Error)
})

test('the creator is admin, and an employee has only employee permissions', async () => {
  const admin = await signUp('admin')
  const employee = await signUp('employee')
  const organizationId = await createOrganization('roles-org', admin.userId)
  await auth.api.addMember({ body: { organizationId, userId: employee.userId, role: 'employee' } })

  expect(await can(admin.headers, organizationId, { project: ['update'] })).toBe(true)
  expect(await can(admin.headers, organizationId, { profile: ['requestUpdate'] })).toBe(true)
  expect(await can(employee.headers, organizationId, { technology: ['create'] })).toBe(true)
  expect(await can(employee.headers, organizationId, { project: ['update'] })).toBe(false)
  expect(await can(employee.headers, organizationId, { technology: ['curate'] })).toBe(false)
  expect(await can(employee.headers, organizationId, { member: ['create'] })).toBe(false)
})

test('a member of two organizations switches the active one', async () => {
  const person = await signUp('two-orgs')
  const first = await createOrganization('first-org', person.userId)
  const second = await createOrganization('second-org', person.userId)

  await auth.api.setActiveOrganization({ headers: person.headers, body: { organizationId: first } })
  let session = await auth.api.getSession({ headers: person.headers })
  expect(session?.session.activeOrganizationId).toBe(first)

  await auth.api.setActiveOrganization({
    headers: person.headers,
    body: { organizationId: second },
  })
  session = await auth.api.getSession({ headers: person.headers })
  expect(session?.session.activeOrganizationId).toBe(second)
})

test('an admin cannot delete the organization', async () => {
  const admin = await signUp('deleter')
  const organizationId = await createOrganization('kept-org', admin.userId)
  const error = await auth.api
    .deleteOrganization({ headers: admin.headers, body: { organizationId } })
    .then(
      () => null,
      (reason: unknown) => reason,
    )
  expect(error).toBeInstanceOf(Error)
})

test('sign-in.demo-accounts-locked: in demo mode, a visitor cannot change a shared account', async () => {
  const { headers } = await signUp('demo-visitor')
  headers.set('origin', 'http://localhost:3000')
  headers.set('content-type', 'application/json')
  async function post(path: string, body: object) {
    const request = new Request(`http://localhost:3000/api/auth${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    return (await auth.handler(request)).status
  }

  expect(
    await post('/change-password', {
      currentPassword: 'correct-horse-battery',
      newPassword: 'taken-over-password',
    }),
  ).toBe(404)
  expect(await post('/update-user', { name: 'Renamed' })).toBe(404)

  const signIn = await auth.api.signInEmail({
    body: { email: 'demo-visitor@example.com', password: 'correct-horse-battery' },
    asResponse: true,
  })
  expect(signIn.status).toBe(200)
})
