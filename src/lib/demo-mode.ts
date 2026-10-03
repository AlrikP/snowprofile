// Whether DEMO_MODE is on: as set, or by default in development and test only. An unset
// NODE_ENV counts as production (docs/architecture.md, "Sign-in modes"). src/env.ts and the
// seeder share it, so a script can't see demo mode where the app doesn't.
export function demoModeOn(source: { DEMO_MODE?: string; NODE_ENV?: string }): boolean {
  if (source.DEMO_MODE) return source.DEMO_MODE === 'true'
  return source.NODE_ENV === 'development' || source.NODE_ENV === 'test'
}
