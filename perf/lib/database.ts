// The benchmark database: the demo organizations plus the benchmark one (src/db/seed.ts),
// made once per version of the seed and the schema and reused after that. The generator
// dates everything from DEMO_NOW, so row counts and query plans don't change from one day
// to the next.

import { migrate } from 'drizzle-orm/libsql/migrator'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs'
import { join, relative } from 'node:path'
import { openDatabase } from '#/db/connection'
import { benchmarkOrganization, generateBenchmarkData, seed, seedBenchmark } from '#/db/seed'
import { SEED_PASSWORD } from '#/db/seed-accounts'

export const ROOT = join(import.meta.dir, '../..')
export const CACHE = join(ROOT, 'perf/.cache')

export const BENCHMARK = { id: benchmarkOrganization.id, slug: benchmarkOrganization.slug }

// What the seeded data depends on. A change to any of these makes a new file.
const INPUTS = [
  'src/db/seed.ts',
  'src/db/seed-accounts.ts',
  'src/db/demo',
  'src/db/schema.ts',
  'drizzle',
  'perf/lib/database.ts',
]

// The organization's first admin, and its first employee, who has a profile like every
// generated member.
function benchmarkUsers() {
  const data = generateBenchmarkData()
  function emailOf(role: 'admin' | 'employee') {
    const userId = data.members.find((row) => row.role === role)?.userId
    const email = data.users.find((row) => row.id === userId)?.email
    if (!email) throw new Error(`The benchmark organization has no ${role}.`)
    return email
  }
  return {
    admin: { email: emailOf('admin'), password: SEED_PASSWORD },
    employee: { email: emailOf('employee'), password: SEED_PASSWORD },
  } as const
}

export const USERS = benchmarkUsers()

function files(path: string): string[] {
  const full = join(ROOT, path)
  if (!statSync(full).isDirectory()) return [path]
  return readdirSync(full, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(ROOT, join(entry.parentPath, entry.name)))
    .sort()
}

export function inputsHash() {
  const hash = createHash('sha256')
  for (const file of INPUTS.flatMap(files)) {
    hash.update(file).update(readFileSync(join(ROOT, file)))
  }
  return hash.digest('hex').slice(0, 12)
}

// Returns the path of the seeded file, seeding it first when this version has none, and
// removes older versions. Seeding takes a few seconds.
export async function seededDatabase(cache = CACHE): Promise<string> {
  mkdirSync(cache, { recursive: true })
  const path = join(cache, `benchmark-${inputsHash()}.db`)
  if (existsSync(path)) return path

  for (const old of readdirSync(cache)) {
    if (old.startsWith('benchmark-')) rmSync(join(cache, old), { force: true })
  }
  const started = performance.now()
  console.log(`[perf] Seeding ${relative(ROOT, path)} ...`)
  // Seeded under another name and renamed, so an interrupted run leaves nothing to reuse.
  const partial = `${path}.partial`
  rmSync(partial, { force: true })
  const db = openDatabase(`file:${partial}`)
  await migrate(db, { migrationsFolder: join(ROOT, 'drizzle') })
  await seed(db)
  await seedBenchmark(db)
  db.$client.close()
  renameSync(partial, path)
  console.log(`[perf] Seeded in ${((performance.now() - started) / 1000).toFixed(1)} s`)
  return path
}
