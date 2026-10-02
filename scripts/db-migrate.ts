// Checks that applied migrations are unchanged (db-verify.ts), then applies pending ones.
// drizzle-kit runs as a child of this Bun process, so it inherits the .env files Bun loaded.
//
// Usage: bun run db:migrate   (the database in DATABASE_URL)

import { spawnSync } from 'node:child_process'

for (const command of [
  [process.execPath, 'scripts/db-verify.ts'],
  [process.execPath, 'node_modules/drizzle-kit/bin.cjs', 'migrate'],
]) {
  const result = spawnSync(command[0], command.slice(1), { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
