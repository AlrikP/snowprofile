# 014: Lint rules

Status: done
Depends on: task 009 (server code), task 012 (frontend code)

Enforce the conventions in `AGENTS.md` ("Code conventions") that a later session could
lose.

## Acceptance criteria

- [x] `func-style` requires declarations; `src/components/ui/` is exempt.
- [x] Import boundaries: `src/features/` only from routes and `src/router.tsx`; no
      `*.server.ts` from client code, and `src/server/middleware.ts` only from
      `*.functions.ts`; relative imports only inside the importer's area, `#/` across
      areas.
- [x] Only repository modules (`*.repository.server.ts`), `src/db/`, `scripts/`, tests, and
      `src/server/auth/better-auth.server.ts` import `#/db/schema` or `drizzle-orm`.
- [x] knip, with the app's entry points and ignores for generated files and prototypes,
      in the pre-commit hook and CI. It knows `@inlang/plugin-message-format`, which only
      `project.inlang/settings.json` references.
- [x] `icons:check` enforces the `Icon` suffix on Lucide imports and hand-written icons,
      with a `--fix` mode.
- [x] Every rule a convention names is enforced; `AGENTS.md` names the check beside each
      convention, drops the "planned" markers, and lists the conventions that stay
      manual.

## Outcome

- Import boundaries are oxlint `no-restricted-imports` with one complete set of
  restrictions per file group, since an override replaces a rule's options rather than
  merging them (`.oxlintrc.json`).
- The relative-or-`#/` area rule is a script (`imports:check`), because it depends on
  where a path resolves. A folder's index and files outside `src/` needed special cases.
- Probe files breaking each rule in each file group confirmed the rules fire; they caught
  `#/features/*` matching only one path segment (now `**`).
- The checks caught real issues: a client import of a server-only type, arrow-function
  helpers, a relative import at the `src/` root, and dead exports that knip found.
- knip ignores the shadcn copies and `src/db/schema.ts`'s exports, which Better Auth uses
  through `import * as schema`, invisible to knip.
- Conventions without a check are listed in `AGENTS.md`, "Checked in review". Reading
  environment variables only through `src/env.ts` could become an oxlint rule later.
