// Starts the production build for end-to-end tests on a fresh, seeded database. Settings
// are explicit and Bun's .env loading is off, so a developer's .env.local (another
// database, a login domain allowlist) can't leak in.
import { mkdirSync, rmSync } from 'node:fs'

export const E2E_PORT = 3100

const env = {
  PATH: process.env.PATH,
  NODE_ENV: 'production',
  PORT: String(E2E_PORT),
  DATABASE_URL: 'file:e2e/.data/e2e.db',
  BETTER_AUTH_URL: `http://localhost:${E2E_PORT}`,
  // A fixed secret: the database and its sessions are thrown away after each run.
  BETTER_AUTH_SECRET: 'e2e-only-secret-not-used-anywhere-else',
  DEMO_MODE: 'true',
  // Already migrated for the seed; the server still verifies on start, as deployed.
  MIGRATE_ON_START: 'true',
}

function run(...args: string[]) {
  const { exitCode } = Bun.spawnSync(['bun', '--no-env-file', ...args], {
    env,
    stdout: 'inherit',
    stderr: 'inherit',
  })
  if (exitCode !== 0) process.exit(exitCode)
}

if (import.meta.main) {
  rmSync('e2e/.data', { recursive: true, force: true })
  mkdirSync('e2e/.data')
  run('scripts/db-migrate.ts')
  run('scripts/db-seed.ts')
  run('scripts/start.ts')
}
