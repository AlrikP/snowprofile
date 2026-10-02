import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { v7 as uuidv7 } from 'uuid'
import { type Database, db } from '#/db'
import * as schema from '#/db/schema'
import { env } from '#/env'
import { ac, roles } from '#/lib/permissions'
import { loginPolicyHooks } from './login-policy.server'
import { passwordSignInEnabled, type SignInConfig, socialProviders } from './sign-in.server'

// A factory, so tests run the same configuration against their own database and settings.
export function createAuth(database: Database, config: SignInConfig = env) {
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(database, { provider: 'sqlite', schema }),
    advanced: { database: { generateId: () => uuidv7() } },
    // Password accounts exist only in seeded data, so sign-up is always off.
    emailAndPassword: {
      enabled: passwordSignInEnabled(config),
      disableSignUp: true,
    },
    socialProviders: socialProviders(config),
    databaseHooks: loginPolicyHooks(config.ALLOWED_LOGIN_DOMAINS),
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
