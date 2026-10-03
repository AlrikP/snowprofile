import * as v from 'valibot'
import { demoModeOn } from './lib/demo-mode'
import { parseLoginDomains } from './lib/login-domains'

const nonEmpty = v.pipe(v.string(), v.minLength(1))

// Server-side settings, validated once at startup. Keep secrets unprefixed: VITE_ variables
// reach the browser bundle.
const EnvSchema = v.object({
  // Vite sets development for `dev` and bun test sets test; unset counts as production, so
  // development-only behavior stays off unless something turns it on.
  NODE_ENV: v.optional(v.picklist(['development', 'test', 'production']), 'production'),
  // Unset means on in development and test, off otherwise (docs/architecture.md, "Sign-in
  // modes").
  DEMO_MODE: v.optional(v.picklist(['true', 'false'])),
  BETTER_AUTH_SECRET: v.pipe(v.string(), v.minLength(32)),
  BETTER_AUTH_URL: v.pipe(v.string(), v.url()),
  // Every environment uses a local SQLite file (docs/architecture.md, "Stack").
  DATABASE_URL: v.pipe(v.string(), v.startsWith('file:')),
  // Google sign-in is on when both are set and DEMO_MODE is off.
  GOOGLE_CLIENT_ID: v.optional(nonEmpty),
  GOOGLE_CLIENT_SECRET: v.optional(nonEmpty),
  ALLOWED_LOGIN_DOMAINS: v.optional(v.pipe(nonEmpty, v.transform(parseLoginDomains))),
})

// Empty values count as unset, so a blank line copied from .env.example changes nothing.
function withoutEmpty(source: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ''))
}

export function parseEnv(source: Record<string, string | undefined>) {
  const parsed = v.parse(EnvSchema, withoutEmpty(source))
  const env = {
    ...parsed,
    DEMO_MODE: demoModeOn(parsed),
    ALLOWED_LOGIN_DOMAINS: parsed.ALLOWED_LOGIN_DOMAINS ?? [],
  }
  if (Boolean(env.GOOGLE_CLIENT_ID) !== Boolean(env.GOOGLE_CLIENT_SECRET)) {
    throw new Error('Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or neither.')
  }
  // Seeded users have example.com addresses, so a domain allowlist would lock them out.
  if (env.DEMO_MODE && env.ALLOWED_LOGIN_DOMAINS.length > 0) {
    throw new Error('DEMO_MODE signs in seeded users; unset ALLOWED_LOGIN_DOMAINS or DEMO_MODE.')
  }
  return env
}

export type Env = ReturnType<typeof parseEnv>

export const env = parseEnv(process.env)
