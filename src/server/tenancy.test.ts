/// <reference types="bun" />

// Organization isolation through the repositories: a user acting in organization A can't
// read or change organization B's data through any repository function. Every function a
// *.repository.server.ts exports needs a case here, so a new one can't skip the check.
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { and, count, eq, isNotNull, isNull } from 'drizzle-orm'
import { basename } from 'node:path'
import { v7 as uuidv7 } from 'uuid'
import type { Database } from '#/db'
import { withActor } from '#/db/actor'
import { employeeProfile, updateRequest } from '#/db/schema'
import { seedIds } from '#/db/seed'
import { createTestDatabase, failure } from '#/db/testing'
import * as account from './account/account.repository.server'
import { findMemberRole } from './organizations/organizations.repository.server'
import * as profiles from './profiles/profiles.repository.server'
import { resolveScope, type Scope } from './scope.server'

let db: Database
let cleanup: () => void
// Acting in A, the demo organization.
let scopeA: Scope
// Rows in B, another demo organization.
const b = { organizationId: seedIds.orgs.tormilind, profileId: '', openProfileId: '' }

async function bProfile(open: boolean) {
  const [row] = await db
    .select({ id: employeeProfile.id })
    .from(employeeProfile)
    .leftJoin(
      updateRequest,
      and(eq(updateRequest.profileId, employeeProfile.id), isNull(updateRequest.closedAt)),
    )
    .where(
      and(
        eq(employeeProfile.organizationId, b.organizationId),
        open ? isNotNull(updateRequest.id) : isNull(updateRequest.id),
      ),
    )
  if (!row) throw new Error('expected a seeded profile in B')
  return row.id
}

async function bRequests() {
  const [row] = await db
    .select({ n: count() })
    .from(updateRequest)
    .where(eq(updateRequest.organizationId, b.organizationId))
  return row?.n
}

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase())
  scopeA = await resolveScope(db, seedIds.users.admin, seedIds.orgs.demo)
  b.profileId = await bProfile(false)
  b.openProfileId = await bProfile(true)
})

afterAll(() => cleanup())

// One per repository function, keyed "<module>.<function>", where <module> is the file
// name without .repository.server.ts.
const cases: Record<string, () => Promise<void>> = {
  // The account is the user's own, not organization data: it takes the session's user ID,
  // and reaches only that user's row.
  'account.findLocale': async () => {
    await account.updateLocale(db, seedIds.users.employee, 'en')
    expect(await account.findLocale(db, seedIds.users.admin)).toBeNull()
  },
  'account.updateLocale': async () => {
    await account.updateLocale(db, seedIds.users.employee, 'en')
    await account.updateLocale(db, seedIds.users.admin, 'et')
    expect(await account.findLocale(db, seedIds.users.employee)).toBe('en')
  },
  'organizations.findMemberRole': async () => {
    // The lookup that builds a scope: a member of A has no role in B.
    expect(await findMemberRole(db, seedIds.users.employee, b.organizationId)).toBeUndefined()
  },
  'profiles.findProfile': async () => {
    expect(await profiles.findProfile(db, scopeA, b.profileId)).toBeUndefined()
  },
  'profiles.hasOpenUpdateRequest': async () => {
    expect(await profiles.hasOpenUpdateRequest(db, scopeA, b.openProfileId)).toBe(false)
  },
  'profiles.insertUpdateRequest': async () => {
    const before = await bRequests()
    const insert = () =>
      withActor(scopeA.userId, () =>
        profiles.insertUpdateRequest(db, scopeA, {
          id: uuidv7(),
          profileId: b.profileId,
          message: null,
        }),
      )
    expect(await failure(insert)).toContain('FOREIGN KEY')
    expect(await bRequests()).toBe(before)
  },
}

describe('a user in one organization', () => {
  for (const [name, run] of Object.entries(cases)) {
    test(`can't reach another organization through ${name}`, run)
  }
})

test('every repository function has a case', async () => {
  const exported: string[] = []
  for (const path of new Bun.Glob('src/server/**/*.repository.server.ts').scanSync()) {
    const module: Record<string, unknown> = await import(`#/${path.slice('src/'.length)}`)
    const name = basename(path, '.repository.server.ts')
    for (const [key, value] of Object.entries(module)) {
      if (typeof value === 'function') exported.push(`${name}.${key}`)
    }
  }
  expect(exported.sort()).toEqual(Object.keys(cases).sort())
})
