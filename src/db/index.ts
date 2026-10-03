// The app's database. Only repository modules import it; they apply the organization
// scoping (docs/architecture.md, "Application rules"). Server code only.
import { env } from '#/env'
import { openDatabase } from './connection'

export const db = openDatabase(env.DATABASE_URL)

export type Database = typeof db

// A transaction handle from db.transaction(); helpers that run inside one accept either.
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
export type Executor = Database | Transaction
