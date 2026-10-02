# CR-001.1: Clean checkout and CI build

Status: done

A clean checkout builds and tests like the working copy, and CI catches it when it
doesn't.

## Acceptance criteria

- [x] `project.inlang/paraglide.config.ts` is in git (`git add -f`: the inlang-generated
      `project.inlang/.gitignore` ignores everything but `settings.json`). Today a clean
      checkout compiles `strategy = ["cookie", "globalVariable", "baseLocale"]` instead
      of `["cookie", "preferredLanguage", "baseLocale"]`, so browser-language detection
      (task 010.1) is missing in CI and in built images, and three tests in
      `src/features/sign-in/sign-in-page.test.tsx` fail. `bun run check` and
      `bun run test` pass in a `git archive HEAD` export.
- [x] The CI `check` job runs `bun run build`; `AGENTS.md` lists the step.
- [x] Component tests set the locale explicitly in `src/test/setup.ts` instead of relying
      on jsdom's `en-US`, so "shows no demo notice … outside demo mode" can fail.
