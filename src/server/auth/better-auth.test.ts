/// <reference types="bun" />

import { afterAll, beforeAll, expect, test } from 'bun:test'
import { v7 as uuidv7 } from 'uuid'
import type { Database } from '#/db'
import { addPasswordUser } from '#/db/seed'
import { createTestDatabase } from '#/db/testing'
import { createAuth } from './better-auth.server'
import { disabledPaths } from './sign-in.server'

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
  await addPasswordUser(
    db,
    { id: uuidv7(), name, email: `${name}@example.com` },
    'correct-horse-battery',
  )
  return signIn(name)
}

async function signIn(name: string) {
  const response = await auth.api.signInEmail({
    body: { email: `${name}@example.com`, password: 'correct-horse-battery' },
    asResponse: true,
  })
  const headers = new Headers({ cookie: response.headers.get('set-cookie') ?? '' })
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error(`no session for ${name}`)
  return { userId: session.user.id, token: session.session.token, headers }
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

// Sends a request through the HTTP handler, where Better Auth applies disabledPaths.
async function request(
  target: ReturnType<typeof createAuth>,
  headers: Headers,
  path: string,
  body: object = {},
) {
  const endpoint = Object.values(target.api).find((candidate) => candidate.path === path)
  if (!endpoint) throw new Error(`no endpoint ${path}`)
  const methods = [endpoint.options.method].flat()
  const method = methods.includes('POST') ? 'POST' : methods[0]
  const requestHeaders = new Headers(headers)
  requestHeaders.set('origin', 'http://localhost:3000')
  requestHeaders.set('content-type', 'application/json')
  const response = await target.handler(
    new Request(`http://localhost:3000/api/auth${path}`, {
      method,
      headers: requestHeaders,
      body: method === 'GET' ? undefined : JSON.stringify(body),
    }),
  )
  return response.status
}

test('sign-in.demo-accounts-locked: in demo mode, a visitor cannot change a shared account', async () => {
  const { headers } = await signUp('demo-visitor')
  const other = await signIn('demo-visitor')

  const paths = disabledPaths({ DEMO_MODE: true, ALLOWED_LOGIN_DOMAINS: [] })
  expect(paths).toContain('/list-sessions')
  expect(paths).toContain('/revoke-session')
  for (const path of paths) {
    expect({ path, status: await request(auth, headers, path) }).toEqual({ path, status: 404 })
  }
  expect(await request(auth, headers, '/revoke-session', { token: other.token })).toBe(404)
  expect(await auth.api.getSession({ headers: other.headers })).not.toBeNull()

  expect((await signIn('demo-visitor')).token).toBeTruthy()
  expect(await request(auth, headers, '/sign-out')).toBe(200)
})

test('outside demo mode, a user lists and ends their own sessions', async () => {
  const first = await signUp('company-user')
  const second = await signIn('company-user')
  const company = createAuth(db, { DEMO_MODE: false, ALLOWED_LOGIN_DOMAINS: [] })

  expect(disabledPaths({ DEMO_MODE: false, ALLOWED_LOGIN_DOMAINS: [] })).not.toContain(
    '/list-sessions',
  )
  expect(await request(company, first.headers, '/list-sessions')).toBe(200)
  expect(await request(company, first.headers, '/revoke-session', { token: second.token })).toBe(
    200,
  )
  expect(await company.api.getSession({ headers: second.headers })).toBeNull()
  expect(await request(company, first.headers, '/sign-out')).toBe(200)
})

test('the plugin’s own role endpoint is closed, even to admins', async () => {
  const admin = await signUp('role-admin')
  const organizationId = await createOrganization('role-org', admin.userId)
  const company = createAuth(db, { DEMO_MODE: false, ALLOWED_LOGIN_DOMAINS: [] })

  expect(
    await request(company, admin.headers, '/organization/update-member-role', {
      organizationId,
      memberId: 'any',
      role: 'employee',
    }),
  ).toBe(404)
})
