# 002: Component testing

Status: done

Set up component tests so UI work has a fast check (`docs/architecture.md`, "Stack",
Tests). Server tests use `bun test`; component tests use Vitest. Each runner must ignore
the other's files.

## Acceptance criteria

- [x] Vitest with React Testing Library, `@testing-library/user-event`, and
      `@testing-library/jest-dom` in jsdom; versions pinned and recorded in
      `architecture.md`.
- [x] `vitest.config.ts` runs only `*.test.tsx`; `bunfig.toml` keeps `bun test` to
      `*.test.ts`.
- [x] One component test (for example the shadcn `Button` rendering and handling a
      click) passes.
- [x] `package.json` has `test:components` and a `test` script that runs every test
      runner present; `AGENTS.md` and the README list them.
