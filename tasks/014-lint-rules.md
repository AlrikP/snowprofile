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
