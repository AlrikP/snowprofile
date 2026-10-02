import { AsyncLocalStorage } from 'node:async_hooks'

// The user a database write is made on behalf of. Server-function middleware wraps each
// request in withActor(), and the schema's created_by and updated_by columns read it on
// every insert and update. SQLite has no session variables, so a trigger can't do this.

// Seeds, imports, and maintenance scripts act as this user. The catalogue migration
// creates it; it has no account, so nobody signs in as it.
export const SYSTEM_USER_ID = '00000000-0000-7000-8000-000000000000'

const storage = new AsyncLocalStorage<string>()

// Await the queries inside fn. A Drizzle query runs when awaited, so a builder returned
// unawaited from fn runs after the actor's scope has ended, and fails.
export function withActor<T>(userId: string, fn: () => T): T {
  return storage.run(userId, fn)
}

export function currentActor(): string {
  const userId = storage.getStore()
  if (!userId) throw new Error('Database write without an actor. Wrap the call in withActor().')
  return userId
}
