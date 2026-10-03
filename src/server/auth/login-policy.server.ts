// Database hooks that keep sign-in to verified addresses in the allowed email domains and start each session in
// one of the user's organizations.
import type { BetterAuthOptions } from 'better-auth'
import { APIError } from 'better-auth/api'
import { loginDomainAllowed } from '#/lib/login-domains'

type SessionCreateBefore = NonNullable<
  NonNullable<NonNullable<BetterAuthOptions['databaseHooks']>['session']>['create']
>['before']
type HookContext = Parameters<NonNullable<SessionCreateBefore>>[1]

type EmailOwner = { email: string; emailVerified: boolean }

// The domain says who someone is only if the provider verified the address, so with an
// allowlist an unverified address is refused like one outside it.
function requireAllowedEmail(user: EmailOwner | null, domains: readonly string[]) {
  if (domains.length === 0) return
  if (user?.emailVerified && loginDomainAllowed(user.email, domains)) return
  throw new APIError('FORBIDDEN', {
    code: 'LOGIN_DOMAIN_NOT_ALLOWED',
    message: 'This email domain cannot sign in here.',
  })
}

export function loginPolicyHooks(domains: readonly string[]) {
  return {
    user: {
      create: {
        before: async (user: EmailOwner) => {
          requireAllowedEmail(user, domains)
        },
      },
    },
    session: {
      create: {
        // Checking each new session, not only new users, also refuses users who signed up
        // before ALLOWED_LOGIN_DOMAINS was set or narrowed.
        before: async <S extends { userId: string }>(session: S, context: HookContext) => {
          if (!context) {
            requireAllowedEmail(null, domains)
            return
          }
          const user = await context.context.internalAdapter.findUserById(session.userId)
          requireAllowedEmail(user, domains)

          // The first page then has an organization in scope; a user in several switches.
          const [membership] = await context.context.adapter.findMany<{ organizationId: string }>({
            model: 'member',
            where: [{ field: 'userId', value: session.userId }],
            sortBy: { field: 'createdAt', direction: 'asc' },
            limit: 1,
          })
          if (!membership) return
          return { data: { ...session, activeOrganizationId: membership.organizationId } }
        },
      },
    },
  }
}
