# CR-002.2: Import and spec checks

Status: done

The checks from tasks 014 and 023 refuse what their conventions forbid, however the code
is written.

## Acceptance criteria

- [x] oxlint refuses `#/db`, `#/db/connection`, and `#/env` in client code (features,
      components, `src/lib/`, and routes outside `api/`), and `AGENTS.md` names them as
      server-only modules beside `src/server/middleware.ts`. Today only `#/db/schema` and
      `drizzle-orm` are restricted (`.oxlintrc.json:42`); a `src/lib/` file importing
      `{ db } from '#/db'` and `{ env } from '#/env'` passes lint.
- [x] `imports:check` refuses a relative import that isn't the shortest path to its
      target. Today `src/server/auth/x.server.ts` importing `'../../server/middleware'`
      passes both it and oxlint, whose pattern matches only `'../middleware'`.
- [x] `specs:check` ignores skipped, todo, and commented-out tests, and
      `scripts/specs-check.test.ts` covers them. Today its regex
      (`scripts/specs-check.ts:21`) counts `test.skip('<id>: …')` as a citation.
- [x] `signedIn` moves out of `src/server/auth/auth.functions.ts:21` into a `*.server.ts`
      rule, so the server functions only pick middleware and call rules.

## Outcome

- oxlint restricts `#/db`, `#/db/connection`, and `#/env` by name in the default rule set
  and the routes override. Client code can't reach them through a relative path either,
  since `imports:check` requires `#/` across areas.
- `imports:check` compares each relative specifier with the shortest one to its target,
  so `../../server/middleware` from `src/server/auth/` now fails. The repository already
  passed.
- `specs:check` runs each test file through `Bun.Transpiler`, which drops comments, then
  counts `test`, `it`, and `setup`, plain or with `.only`, `.concurrent`, or `.serial`.
  Any other modifier (`skip`, `todo`, `fixme`, `failing`) cites nothing. A parser was the
  alternative, but TypeScript 7 has no JS API and `oxc-parser` is only a transitive
  dependency.
- `signedIn`, and the access and frame shaping that used it, moved into
  `src/server/auth/session.server.ts` as `access(db)` and `frame(db)`.
- The oxlint restrictions were tried on throwaway files in `src/lib/` and `src/routes/`;
  the two scripts' tests cover their new cases.
