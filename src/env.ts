import * as v from 'valibot'

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
})

export function parseEnv(source: Record<string, string | undefined>) {
  const parsed = v.parse(EnvSchema, source)
  return {
    ...parsed,
    DEMO_MODE: parsed.DEMO_MODE ? parsed.DEMO_MODE === 'true' : parsed.NODE_ENV !== 'production',
  }
}

export type Env = ReturnType<typeof parseEnv>

export const env = parseEnv(process.env)
