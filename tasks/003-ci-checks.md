# 003: CI checks

Status: in-progress

Run the repository's checks on every pull request and on `main`, so a broken change
can't merge unnoticed. Later tasks add their checks to the same job.

## Acceptance criteria

- [x] One GitHub Actions workflow with a `check` job on pull requests and pushes to
      `main`: install with the lockfile frozen, format check, lint, type check, and the
      tests that exist (`bun test`, Vitest).
- [x] Actions are pinned to major versions; Dependabot keeps the `github-actions`
      ecosystem current.
- [x] Bun's version in CI comes from `package.json`'s `packageManager`.
- [x] actionlint runs in the lefthook pre-commit hook for workflow files. How it is
      installed is recorded in the README; ask before any global install.
- [x] Checked locally by the agent: actionlint passes, and every command the job runs
      passes.
- [x] `AGENTS.md` notes that knip, schema drift, and the data model check join this job
      when their tasks add them.
- [ ] Done by the user on GitHub: push a branch with a deliberate failure and see the
      `check` job fail.
- [ ] Done by the user on GitHub: require the `check` job in branch protection for
      `main`.
