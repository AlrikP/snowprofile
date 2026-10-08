# 008.2: Seed command

Status: done
Depends on: task 008.1 (the generator the command loads)

## Acceptance criteria

- [x] `db:seed` adds the organizations a local database doesn't have yet and leaves
      existing ones untouched.
- [x] `db:seed --reset <slug>` replaces one demo organization's data and leaves the
      others untouched; tests check both.
- [x] It refuses a database that isn't a local file, and a production stack unless
      `DEMO_MODE` is on; tests cover both refusals.
- [x] `docs/architecture.md` ("Sign-in modes") and the README describe the command.
