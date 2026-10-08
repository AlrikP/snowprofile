// The app's server rules on a copy of the benchmark database, with every statement they run
// recorded: its SQL, its arguments, and the rows it returned.

import { createClient, type InStatement } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { copyFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import type { Database } from '#/db'
import { relations } from '#/db/relations'
import { resolveScope, type Scope } from '#/server/scope.server'
import { BENCHMARK, CACHE, USERS } from '../lib/database'

type Statement = { sql: string; args: unknown[]; rows: number }

export type Recorder = {
  db: Database
  scopes: Record<keyof typeof USERS, Scope>
  // Runs `call` and returns its result with the statements it ran.
  record: <T>(call: () => Promise<T>) => Promise<{ result: T; statements: Statement[] }>
  explain: (statement: Statement) => Promise<string[]>
  // Closes the database and deletes the copy.
  close: () => void
}

const COPY = join(CACHE, 'check.db')

function statementOf(statement: InStatement): { sql: string; args: unknown[] } {
  if (typeof statement === 'string') return { sql: statement, args: [] }
  return { sql: statement.sql, args: Array.isArray(statement.args) ? statement.args : [] }
}

// A column value as text; libSQL types every value as unknown.
function text(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

export async function openRecorder(database: string): Promise<Recorder> {
  copyFileSync(database, COPY)
  // A plain client: the app's (openDatabase) queues each statement behind the last, and a
  // recording execute would wait for its own turn. The checks only read.
  const client = createClient({ url: `file:${COPY}` })
  const execute = client.execute.bind(client)
  let log: Statement[] | null = null
  client.execute = async (statement: InStatement) => {
    const result = await execute(statement)
    log?.push({ ...statementOf(statement), rows: result.rows.length })
    return result
  }

  const db: Database = drizzle({ client, relations })

  const scopes = {} as Recorder['scopes']
  for (const who of Object.keys(USERS) as (keyof typeof USERS)[]) {
    const found = await execute({
      sql: 'select id from user where email = ?',
      args: [USERS[who].email],
    })
    scopes[who] = await resolveScope(db, text(found.rows[0]?.id), BENCHMARK.id)
  }

  return {
    db,
    scopes,
    async record(call) {
      log = []
      try {
        const result = await call()
        return { result, statements: log }
      } finally {
        log = null
      }
    },
    async explain(statement) {
      const plan = await execute({
        sql: `explain query plan ${statement.sql}`,
        args: statement.args as never,
      })
      return plan.rows.map((row) => text(row.detail))
    },
    close() {
      client.close()
      rmSync(COPY, { force: true })
    },
  }
}
