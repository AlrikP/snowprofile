# 041.1: Benchmark data

Status: done

The demo generator builds a larger organization for the performance checks, and a helper
seeds it into a cached database the harnesses share. The generator's fixed moment,
`DEMO_NOW`, plays the part of snowtime's `SEED_NOW`: every generated date derives from
it, so the counts are the same on any day.

## Acceptance criteria

- [x] A benchmark organization with 60 employees, 300 projects, and several times the
      demo organizations' participations per person, generated like the demo ones. The
      seeder doesn't add it.
- [x] `perf/lib/database.ts` seeds the demo organizations and the benchmark one into
      `perf/.cache/`, and reuses the file until the seed, the generator, the schema, or
      the migrations change. Git ignores the cache.
- [x] It names a benchmark admin and employee who sign in with the seed password.
- [x] A test covers the benchmark's size and the reuse of the cached file.

## Outcome

- `benchmarkOrganization` in `src/db/seed.ts` (slug `benchmark`, 16 customers) generates
  300 projects, 60 profiles (54 current members), 885 participations, and about 2,300
  participation and 2,300 project technologies. The demo organizations have 18 to 65
  participations each. The spec's new `participations` range defaults to the old 2 to 5,
  so the demo data is unchanged.
- The sizes are a guess at a few years of growth: the real sheet's counts weren't read,
  since it holds personal data. Change the spec if the company's numbers differ widely.
- Seeding the cached file takes about 0.3 seconds, so the harnesses can afford a reseed
  whenever an input changes. The inputs are the seed files, `src/db/demo/`, the schema,
  the migrations, and `perf/lib/database.ts`.
- `USERS` names the generated admin and first employee by reading the generated data, so
  the emails follow the generator rather than being hard-coded.
- `.oxlintrc.json` lets `perf/**` import server and database modules, as scripts can;
  `AGENTS.md` says so. 041.2 adds `perf/*.ts` as knip entries with its first harness.
- No server clock is set yet: 041.3 sets the server's clock to `DEMO_NOW`, so periods
  that end "now" read the same on any day.
