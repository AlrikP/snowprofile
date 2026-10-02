// Database access for the signed-in user's own account. These take the user's ID from the
// session instead of a scope: the account isn't organization data.
import { eq } from 'drizzle-orm'
import type { Executor } from '#/db'
import { type LOCALES, user } from '#/db/schema'

type Locale = (typeof LOCALES)[number]

export async function findLocale(db: Executor, userId: string): Promise<Locale | null> {
  const [row] = await db.select({ locale: user.locale }).from(user).where(eq(user.id, userId))
  return row?.locale ?? null
}

// Better Auth's user table has no audit columns; updated_at is its own.
export async function updateLocale(db: Executor, userId: string, locale: Locale) {
  await db.update(user).set({ locale, updatedAt: new Date() }).where(eq(user.id, userId))
}
