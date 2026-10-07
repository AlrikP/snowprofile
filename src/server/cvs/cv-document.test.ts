/// <reference types="bun" />

// The DOCX document, opened as Word would: the file is unzipped and its text read back.
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import JSZip from 'jszip'
import type { Database } from '#/db'
import { employeeProfile } from '#/db/schema'
import { seedIds, seedUsers } from '#/db/seed-accounts'
import { createTestDatabase } from '#/db/testing'
import { createAuth } from '../auth/better-auth.server'
import { resolveScope, type Scope } from '../scope.server'
import { rejection, signedIn } from '../testing'
import { cvDocument, cvDocumentResponse } from './cv-document.server'
import { type CvInput, cvDocumentHref } from './cvs.schemas'
import { cv } from './cvs.server'

let db: Database
let cleanup: () => void
let auth: ReturnType<typeof createAuth>
let admin: Scope
let employee: Scope
const org = seedIds.orgs.demo
const today = '2026-10-06'
// Two seeded people who worked on the same project, and that project's name.
let pair: [string, string]
let shared: string

const [adminUser, employeeUser] = seedUsers

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase())
  auth = createAuth(db, { DEMO_MODE: true, ALLOWED_LOGIN_DOMAINS: [] })
  admin = await resolveScope(db, seedIds.users.admin, org)
  employee = await resolveScope(db, seedIds.users.employee, org)
  const all = await cv(db, admin, input(await profileIds()), today)
  const project = all.projects.find((each) => each.kind === 'project' && each.parts.length > 1)
  if (!project) throw new Error('expected a seeded project with two people')
  pair = [project.parts[0]?.profileId ?? '', project.parts[1]?.profileId ?? '']
  shared = project.name
})

afterAll(() => cleanup())

async function profileIds() {
  const rows = await db
    .select({ id: employeeProfile.id })
    .from(employeeProfile)
    .where(eq(employeeProfile.organizationId, org))
  return rows.map((row) => row.id)
}

function input(profileIds: string[], overrides: Partial<CvInput> = {}): CvInput {
  return {
    profileIds,
    language: 'en',
    technologyIds: [],
    roleIds: [],
    criterionIds: [],
    from: null,
    to: null,
    birthDate: false,
    ...overrides,
  }
}

// The document's text runs, in order, as Word shows them.
async function runs(buffer: Buffer | Uint8Array) {
  const zip = await JSZip.loadAsync(buffer)
  const xml = (await zip.file('word/document.xml')?.async('string')) ?? ''
  return [...xml.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map(([, text]) =>
    (text ?? '')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"')
      .replaceAll('&apos;', "'")
      .replaceAll('&amp;', '&'),
  )
}

describe('cvDocument', () => {
  test('cv-document.personal: has the person, their education, and their projects with roles, periods, and technologies', async () => {
    const [person] = pair
    const read = await cv(db, admin, input([person]), today)
    const { fileName, buffer } = await cvDocument(db, admin, input([person]), today)
    const text = await runs(buffer)

    expect(fileName).toBe(`CV ${read.people[0]?.fullName} ${today}.docx`)
    expect(text[0]).toBe(read.people[0]?.fullName)
    expect(text).toContain('Project')
    expect(text).toContain('Technologies')
    for (const each of read.people[0]?.education ?? []) {
      expect(text.join(' ')).toContain(each.institution?.text ?? '')
    }
    expect(read.projects.length).toBeGreaterThan(0)
    for (const project of read.projects) {
      const part = project.parts[0]
      const name = project.employer ? `${project.name} (${project.employer})` : project.name
      expect(text).toContain(name)
      for (const role of part?.roles ?? []) expect(text).toContain(role.text)
      if (part?.technologies.length) expect(text).toContain(part.technologies.join(', '))
    }
  })

  test('cv-document.team-shared-once: a team CV is one document with a shared project once', async () => {
    const read = await cv(db, admin, input(pair), today)
    const { fileName, buffer } = await cvDocument(db, admin, input(pair), today)
    const text = await runs(buffer)

    expect(fileName).toBe(`Team CV ${today}.docx`)
    for (const person of read.people) expect(text).toContain(person.fullName)
    expect(text.filter((each) => each === shared)).toHaveLength(1)
    expect(text).toContain('People and roles')
  })

  test('cv-document.language: the document is in the chosen language', async () => {
    const { fileName, buffer } = await cvDocument(db, admin, input(pair, { language: 'et' }), today)
    const text = await runs(buffer)

    expect(fileName).toBe(`Meeskonna CV ${today}.docx`)
    expect(text).toContain('Projektid')
    expect(text).toContain('Inimesed ja rollid')
    expect(text).not.toContain('Project')
  })

  test('cv-document.employee-refused: an employee gets no document', async () => {
    expect(await rejection(cvDocument(db, employee, input(pair), today))).toMatchObject({
      code: 'FORBIDDEN',
      key: 'cv_forbidden',
    })
  })
})

describe('the download route', () => {
  function request(headers: Headers, href = cvDocumentHref(org, input(pair))) {
    return cvDocumentResponse(db, auth, new Request(`http://localhost${href}`, { headers }), today)
  }

  test('cv-document.personal: serves the document as an attachment named after the person', async () => {
    const [person] = pair
    const read = await cv(db, admin, input([person]), today)
    const response = await request(
      await signedIn(auth, adminUser.email),
      cvDocumentHref(org, input([person], { birthDate: true })),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
    const name = encodeURIComponent(`CV ${read.people[0]?.fullName} ${today}.docx`)
    expect(response.headers.get('content-disposition')).toContain(`filename*=UTF-8''${name}`)
    expect((await runs(new Uint8Array(await response.arrayBuffer())))[0]).toBe(
      read.people[0]?.fullName,
    )
  })

  test('cv-document.employee-refused: the route refuses an employee, and a signed-out visitor', async () => {
    expect((await request(await signedIn(auth, employeeUser.email))).status).toBe(403)
    expect((await request(new Headers())).status).toBe(401)
  })

  test('refuses a selection it can’t read', async () => {
    const headers = await signedIn(auth, adminUser.email)
    expect((await request(headers, `/api/cv-document?organizationId=${org}`)).status).toBe(400)
  })
})
