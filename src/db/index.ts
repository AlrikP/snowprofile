// The app's database. Only repository modules import it; they apply the organization
// scoping (docs/architecture.md, "Application rules"). Server code only.
import { drizzle } from 'drizzle-orm/libsql'
import { env } from '#/env'
import { openClient } from './connection'
import { relations } from './relations'

export const db = drizzle({ client: openClient({ url: env.DATABASE_URL }), relations })

export type Database = typeof db

// A transaction handle from db.transaction(); helpers that run inside one accept either.
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
export type Executor = Database | Transaction
