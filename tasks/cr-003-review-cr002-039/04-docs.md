# CR-003.4: Docs

Status: todo

The docs and open tasks match the code, and the done review task is archived
(`review.md`, "Doc drift").

## Acceptance criteria

- [ ] `docs/architecture.md`, "Environments and deployment", says `build:scripts` bundles
      the organization script too. Today it names the start script and the seeder only
      (`docs/architecture.md:378`).
- [ ] Task 040 extends the existing `docs/specs/organizations.md` instead of adding it.
      Today it says Organizations has no spec (`tasks/040-specs-for-built-capabilities.md:6`)
      and lists the file as added (`:25`); task 039.1 created it.
- [ ] `docs/product.md`, "Technology catalogue", names the category "Infrastructure", as
      the code and `organizations.created-by-script` do. Today it says "Infra"
      (`docs/product.md:39`).
- [ ] Task cr-002 is in `tasks/000-archive/` (`git mv`), per `tasks/README.md`, "Archive".
