// Database hooks that keep sign-in to the allowed email domains and start each session in
// one of the user's organizations.
import type { BetterAuthOptions } from 'better-auth'
import { APIError } from 'better-auth/api'
import { loginDomainAllowed } from '#/lib/login-domains'

type SessionCreateBefore = NonNullable<
  NonNullable<NonNullable<BetterAuthOptions['databaseHooks']>['session']>['create']
>['before']
type HookContext = Parameters<NonNullable<SessionCreateBefore>>[1]

function requireAllowedEmail(email: string, domains: readonly string[]) {
  if (loginDomainAllowed(email, domains)) return
  throw new APIError('FORBIDDEN', {
    code: 'LOGIN_DOMAIN_NOT_ALLOWED',
    message: 'This email domain cannot sign in here.',
  })
}

export function loginPolicyHooks(domains: readonly string[]) {
  return {
    user: {
      create: {
        before: async (user: { email: string }) => {
          requireAllowedEmail(user.email, domains)
        },
      },
    },
    session: {
      create: {
        // Checking each new session, not only new users, also refuses users who signed up
        // before ALLOWED_LOGIN_DOMAINS was set or narrowed.
        before: async <S extends { userId: string }>(session: S, context: HookContext) => {
          if (!context) {
            if (domains.length > 0) requireAllowedEmail('', domains)
            return
          }
          const user = await context.context.internalAdapter.findUserById(session.userId)
          requireAllowedEmail(user?.email ?? '', domains)

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
