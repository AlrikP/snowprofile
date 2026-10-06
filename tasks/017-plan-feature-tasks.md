# 017: Plan feature tasks

Status: done
Depends on: task 007 (tables), task 009 (server foundation), task 011 (prototypes), task 012 (app frame), task 023 (spec format)

Write the feature tasks once the foundation exists, so they build on real tables and
patterns rather than guesses.

## Acceptance criteria

- [x] One feature task per MVP scope row in `docs/product.md`, split where a row is large
      (for example Import and CV document); each names the docs, prototype, and tables it
      builds on.
- [x] Each feature task has a "Spec changes" section for its capability spec
      (`docs/specs/README.md`).
- [x] Dependencies between features only where one truly blocks another, so independent
      features can run in parallel.
- [x] Feature tasks that add or change tables depend on task 019, so their migrations
      regenerate the diagram instead of editing it by hand.
- [x] The participation feature task starts with the role catalogue migration
      (`docs/product.md`, "Role catalogue"): a role table and a participation-to-role
      link table, filled from the existing `role_et` and `role_en` values, then those
      columns dropped, for participations and own projects.
- [x] The "Carried to feature tasks" list in `tasks/011-ui-prototypes/06-review.md` is in
      the feature tasks it belongs to.
- [x] Product open questions that block a feature are resolved with the user or listed in
      that feature's task.
- [x] Each task or subtask fits one reviewable commit (`tasks/README.md`).
- [x] A performance checks task is filed, following snowtime's `perf/` approach (bundle
      size, query plans, page weight, load, on seeded data at a fixed moment), to start
      once the first features exist.
- [x] Task 022 (dark mode) lists the feature tasks with views in its `Depends on`.

## Outcome

- Feature tasks 025 to 039, one per MVP scope row still to build. Sign-in, Organizations,
  Demo data, and UI languages are built; task 040 writes the three specs they lack. The
  Bilingual content row is task 025 with the shared inputs, so forms in parallel tasks
  don't each build their own.
- The pickers sit with their catalogues: task 026 builds the technology picker and task
  032 the role picker, so a form task depends on the catalogue, not the other way round.
  The role catalogue migration is task 031.1, as required, and task 032 follows it.
- Independent starting points: tasks 025, 026, 028.1, 029.1, 031.1, and 039.2. Pages that
  read seeded data (project view, search, CV selection) don't wait for the forms that
  write it. Task 031.1 should land early: later reads of roles would otherwise use the
  columns it drops.
- Decided with the user on 2026-10-06 and recorded in `docs/product.md` and
  `docs/architecture.md`: membership is invite-only everywhere, Snowhound included; a
  script creates other organizations and invites their first admin (task 039.1);
  marking a person as left also removes their membership; certificates and computed
  experience totals are after the MVP. A personal space for uninvited sign-ups and
  company registration approved by a platform super-admin are listed after the MVP,
  without a task.
- Imported employees are matched by a company email column added to the sheet before the
  migration; their first Google sign-in finds the imported profile (`docs/architecture.md`,
  "From the sheet"; task 039.4). Not blocking: CV table columns (task 037), update emails and
  leaver retention (task 034).
- Task 041 files the performance checks after snowtime's `perf/`; task 022 depends on
  every task with a view, and task 021 on the members and People pages.
