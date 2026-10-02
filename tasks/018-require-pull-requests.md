# 018: Require pull requests on main

Status: todo

Changes go straight to `main` for now: one developer works on the repository, and no
workflow deploys from `main`. The `main` ruleset on GitHub requires only the `check` job,
which blocks merging a failing pull request but not a direct push. Start this task when a
second developer joins or a push to `main` starts a deployment, whichever comes first.

## Acceptance criteria

- [ ] Done by the user on GitHub: the `main` ruleset also has "Require a pull request
      before merging" turned on, so changes reach `main` only through a pull request with
      a passing `check` job.
- [ ] `AGENTS.md` ("Git") and `tasks/README.md` ("Finishing a task") describe the pull
      request flow: a branch per task, and the user merges after review.
