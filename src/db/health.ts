import { sql } from 'drizzle-orm'
import type { Executor } from '.'

// Whether the database answers a trivial query, for the health endpoint.
export async function databaseReachable(db: Executor): Promise<boolean> {
  try {
    await db.run(sql`SELECT 1`)
    return true
  } catch {
    return false
  }
}
