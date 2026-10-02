// Which sign-in methods an environment offers, as pure functions of its settings, so the
// auth instance and the sign-in page build from the same rule (docs/architecture.md,
// "Sign-in modes").
import { SEED_PASSWORD, seedUsers } from '#/db/seed'
import type { Env } from '#/env'

export type SignInConfig = Pick<Env, 'DEMO_MODE'>

export type SignInMethod = 'password'

// Password sign-in exists only for seeded, fictional users, so only in demo mode. With it
// off, Better Auth rejects the password endpoints on the server.
export function passwordSignInEnabled(config: SignInConfig): boolean {
  return config.DEMO_MODE
}

export function signInMethods(config: SignInConfig): SignInMethod[] {
  return passwordSignInEnabled(config) ? ['password'] : []
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
