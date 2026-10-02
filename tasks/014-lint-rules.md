# 014: Lint rules

Status: todo
Depends on: task 009 (server code), task 012 (frontend code)

Enforce the conventions in `AGENTS.md` ("Code conventions") that a later session could
lose.

## Acceptance criteria

- [ ] `func-style` requires declarations; `src/components/ui/` is exempt.
- [ ] Import boundaries: `src/features/` only from routes and `src/router.tsx`; no
      `*.server.ts` from client code; relative imports only inside the importer's area,
      `#/` across areas.
- [ ] knip, with the app's entry points and ignores for generated files and prototypes,
      in the pre-commit hook and CI.
- [ ] `icons:check` enforces the `Icon` suffix on Lucide imports and hand-written icons,
      with a `--fix` mode.
- [ ] Every rule a convention names is enforced; `AGENTS.md` names the check beside each
      convention, and lists the conventions that stay manual.
