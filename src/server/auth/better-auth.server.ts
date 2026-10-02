import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { v7 as uuidv7 } from 'uuid'
import { type Database, db } from '#/db'
import * as schema from '#/db/schema'
import { env } from '#/env'
import { ac, roles } from '#/lib/permissions'

// A factory, so tests run the same configuration against their own database.
export function createAuth(database: Database) {
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(database, { provider: 'sqlite', schema }),
    advanced: { database: { generateId: () => uuidv7() } },
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      organization({
        ac,
        roles,
        creatorRole: 'admin',
        // Platform operators create organizations (docs/product.md, "Users and access").
        allowUserToCreateOrganization: false,
        // Organizations own all their data and are never hard-deleted.
        disableOrganizationDeletion: true,
      }),
      // Must stay last: it sets cookies from the other plugins' responses.
      tanstackStartCookies(),
    ],
  })
}

export const auth = createAuth(db)
