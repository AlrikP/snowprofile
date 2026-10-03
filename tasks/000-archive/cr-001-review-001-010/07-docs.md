# CR-001.7: Docs

Status: done
Depends on: tasks cr-001.2 to cr-001.6 (the docs describe their outcome)

## Acceptance criteria

- [x] `architecture.md`, "Stack": the build preset matches the code (it says `bun`; Nitro
      builds `node-server`), or the code changes to match.
- [x] `architecture.md`, "Repository layout": `schema.ts` and `drizzle/` lose "(planned)",
      and `src/integrations/`, `messages/`, and `project.inlang/` are listed.
- [x] `architecture.md`, "Sign-in modes", describes the seeder's refusals as the code
      enforces them after the fix above.
- [x] `architecture.md`, "PostgreSQL portability", notes that `user` is a reserved word in
      PostgreSQL.
- [x] `AGENTS.md`, "Code conventions", marks the checks task 014 hasn't built yet
      (import directions, `func-style`, `icons:check`) as planned, and names the shared
      server files the client may import (`src/server/errors.ts`, `src/server/schemas.ts`)
      and `src/server/middleware.ts` as server-only code without the `.server.ts` suffix.
