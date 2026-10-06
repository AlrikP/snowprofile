# CR-002.2: Import and spec checks

Status: todo

The checks from tasks 014 and 023 refuse what their conventions forbid, however the code
is written.

## Acceptance criteria

- [ ] oxlint refuses `#/db`, `#/db/connection`, and `#/env` in client code (features,
      components, `src/lib/`, and routes outside `api/`), and `AGENTS.md` names them as
      server-only modules beside `src/server/middleware.ts`. Today only `#/db/schema` and
      `drizzle-orm` are restricted (`.oxlintrc.json:42`); a `src/lib/` file importing
      `{ db } from '#/db'` and `{ env } from '#/env'` passes lint.
- [ ] `imports:check` refuses a relative import that isn't the shortest path to its
      target. Today `src/server/auth/x.server.ts` importing `'../../server/middleware'`
      passes both it and oxlint, whose pattern matches only `'../middleware'`.
- [ ] `specs:check` ignores skipped, todo, and commented-out tests, and
      `scripts/specs-check.test.ts` covers them. Today its regex
      (`scripts/specs-check.ts:21`) counts `test.skip('<id>: …')` as a citation.
- [ ] `signedIn` moves out of `src/server/auth/auth.functions.ts:21` into a `*.server.ts`
      rule, so the server functions only pick middleware and call rules.
