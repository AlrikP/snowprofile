# 017: Plan feature tasks

Status: todo
Depends on: task 007 (tables), task 009 (server foundation), task 011 (prototypes), task 012 (app frame), task 023 (spec format)

Write the feature tasks once the foundation exists, so they build on real tables and
patterns rather than guesses.

## Acceptance criteria

- [ ] One feature task per MVP scope row in `docs/product.md`, split where a row is large
      (for example Import and CV document); each names the docs, prototype, and tables it
      builds on.
- [ ] Each feature task has a "Spec changes" section for its capability spec
      (`docs/specs/README.md`).
- [ ] Dependencies between features only where one truly blocks another, so independent
      features can run in parallel.
- [ ] Feature tasks that add or change tables depend on task 019, so their migrations
      regenerate the diagram instead of editing it by hand.
- [ ] The participation feature task starts with the role catalogue migration
      (`docs/product.md`, "Role catalogue"): a role table and a participation-to-role
      link table, filled from the existing `role_et` and `role_en` values, then those
      columns dropped, for participations and own projects.
- [ ] Product open questions that block a feature are resolved with the user or listed in
      that feature's task.
- [ ] Each task or subtask fits one reviewable commit (`tasks/README.md`).
- [ ] A performance checks task is filed, following snowtime's `perf/` approach (bundle
      size, query plans, page weight, load, on seeded data at a fixed moment), to start
      once the first features exist.
- [ ] Task 022 (dark mode) lists the feature tasks with views in its `Depends on`.
