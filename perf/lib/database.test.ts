/// <reference types="bun" />

import { afterAll, expect, test } from 'bun:test'
import { count, eq } from 'drizzle-orm'
import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase } from '#/db/connection'
import { employeeProfile, organization, project, user } from '#/db/schema'
import { generateBenchmarkData } from '#/db/seed'
import { BENCHMARK, inputsHash, seededDatabase, USERS } from './database'

const cache = mkdtempSync(join(tmpdir(), 'snowprofile-perf-'))
afterAll(() => rmSync(cache, { recursive: true, force: true }))

test('the benchmark organization has its size', () => {
  const data = generateBenchmarkData()
  expect(data.projects).toHaveLength(300)
  expect(data.employeeProfiles).toHaveLength(60)
  expect(data.participations.length).toBeGreaterThan(600)
})

test('seeds the demo and benchmark organizations once and reuses the file', async () => {
  writeFileSync(join(cache, 'benchmark-stale.db'), '')
  const path = await seededDatabase(cache)
  expect(path).toBe(join(cache, `benchmark-${inputsHash()}.db`))
  expect(() => statSync(join(cache, 'benchmark-stale.db'))).toThrow()

  const modified = statSync(path).mtimeMs
  expect(await seededDatabase(cache)).toBe(path)
  expect(statSync(path).mtimeMs).toBe(modified)

  const db = openDatabase(`file:${path}`)
  try {
    expect(await db.$count(organization)).toBe(4)
    async function scoped(table: typeof project | typeof employeeProfile) {
      const rows = await db
        .select({ rows: count() })
        .from(table)
        .where(eq(table.organizationId, BENCHMARK.id))
      return rows[0]?.rows
    }
    expect(await scoped(project)).toBe(300)
    expect(await scoped(employeeProfile)).toBe(60)
    const emails = await db.select({ email: user.email }).from(user)
    expect(emails.map((row) => row.email)).toEqual(
      expect.arrayContaining([USERS.admin.email, USERS.employee.email]),
    )
  } finally {
    db.$client.close()
  }
})
