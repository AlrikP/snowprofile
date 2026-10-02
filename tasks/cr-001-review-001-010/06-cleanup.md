# CR-001.6: Auth checks and cleanup

Status: todo
Depends on: task cr-001.1 (a clean checkout to test against)

## Acceptance criteria

- [ ] The login-domain hooks (`src/server/auth/login-policy.server.ts`) also require a
      verified email.
- [ ] `src/server/auth/sign-in.server.ts` no longer imports `#/db/seed`; the seed's
      password and accounts come from a small module that doesn't pull the demo generator
      into the server bundle.
- [ ] `src/env.ts`, `src/router.tsx`, and `src/routes/__root.tsx` import across areas
      through `#/`.
- [ ] `src/lib/utils.ts`, the `clsx` and `tailwind-merge` dependencies it alone uses, and
      `pnpm.onlyBuiltDependencies` in `package.json` are removed.
- [ ] The language switch catches a failed save and shows `errorMessage()` instead of
      leaving an unhandled rejection (`src/components/language-switch.tsx:26`).
- [ ] The inlang plugin that `i18n:compile` downloads from jsDelivr
      (`project.inlang/settings.json`) is either kept, with the reason recorded in
      `architecture.md`, or replaced with a local copy.
