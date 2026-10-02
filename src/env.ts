import * as v from 'valibot'

// Server-side settings, validated once at startup. Keep secrets unprefixed: VITE_ variables
// reach the browser bundle.
const EnvSchema = v.object({
  BETTER_AUTH_SECRET: v.pipe(v.string(), v.minLength(32)),
  BETTER_AUTH_URL: v.pipe(v.string(), v.url()),
})

export const env = v.parse(EnvSchema, process.env)
