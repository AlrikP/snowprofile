// Which sign-in methods an environment offers, as pure functions of its settings, so the
// auth instance and the sign-in page build from the same rule (docs/architecture.md,
// "Sign-in modes").
import { SEED_PASSWORD, seedUsers } from '#/db/seed-accounts'
import type { Env } from '#/env'

export type SignInConfig = Pick<
  Env,
  'DEMO_MODE' | 'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET' | 'ALLOWED_LOGIN_DOMAINS'
>

export type SignInMethod = 'google' | 'password'

// Password sign-in exists only for seeded, fictional users, so only in demo mode. With it
// off, Better Auth rejects the password endpoints on the server.
export function passwordSignInEnabled(config: SignInConfig): boolean {
  return config.DEMO_MODE
}

// Demo accounts are shared, and the sign-in page publishes their password, so in demo mode
// nobody may change, take over, or delete one, or see or end the sessions of other visitors
// signed in as the same user.
const demoDisabledPaths = [
  '/change-email',
  '/change-password',
  '/delete-user',
  '/delete-user/callback',
  '/link-social',
  '/list-sessions',
  '/request-password-reset',
  '/reset-password',
  '/revoke-other-sessions',
  '/revoke-session',
  '/revoke-sessions',
  '/unlink-account',
  '/update-user',
]

// The organization plugin's endpoints skip the app's rules: listing members and
// invitations is refused to employees, a leaver keeps a profile with a left date, a role
// change keeps an admin, and invitations create the member's profile. So every plugin
// endpoint is closed over HTTP, including ones a plugin upgrade adds, except set-active,
// which the organization switcher calls (docs/architecture.md, "Roles").
const openOrganizationPaths = new Set(['/organization/set-active'])

// Better Auth's disabledPaths option, given the organization plugin's endpoint paths. It
// applies to HTTP requests only, not to auth.api. A server-only endpoint has no path.
export function disabledPaths(
  config: SignInConfig,
  organizationPaths: (string | undefined)[],
): string[] {
  const closed = organizationPaths.filter(
    (path): path is string =>
      path?.startsWith('/organization/') === true && !openOrganizationPaths.has(path),
  )
  return config.DEMO_MODE ? [...closed, ...demoDisabledPaths] : closed
}

// Better Auth's socialProviders option. src/env.ts refuses a half-set client.
export function socialProviders(config: SignInConfig) {
  if (config.DEMO_MODE || !config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) return {}
  return {
    google: { clientId: config.GOOGLE_CLIENT_ID, clientSecret: config.GOOGLE_CLIENT_SECRET },
  }
}

function signInMethods(config: SignInConfig): SignInMethod[] {
  const methods: SignInMethod[] = []
  if (socialProviders(config).google) methods.push('google')
  if (passwordSignInEnabled(config)) methods.push('password')
  return methods
}

// What the sign-in page needs: the methods, and in demo mode the seeded accounts to try.
export function signInOptions(config: SignInConfig) {
  return {
    methods: signInMethods(config),
    demo: config.DEMO_MODE
      ? { password: SEED_PASSWORD, emails: seedUsers.map((person) => person.email) }
      : null,
  }
}
