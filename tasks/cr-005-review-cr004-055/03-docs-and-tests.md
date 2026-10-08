# CR-005.3: Docs, a scenario test, and plans

Status: todo

The specs, docs, and open plans match the code, and the `own-copy` tests check something
(`review.md`, findings 3 and 4).

## Acceptance criteria

- [ ] `project-participation.own-copy` no longer says the member picks another project,
      and no test cites it for a project change. Today the scenario says so
      (`docs/specs/project-participation.md:139`), and the component test at
      `src/features/profile/profile-page.test.tsx:627` selects an option on a disabled
      select, which changes nothing, so it passes whatever the form does.
- [ ] `docs/specs/cv-selection.md` says the empty people field suggests the first 8 people
      in name order. Today it says "everyone it offers" (`:39`), and
      `src/features/cvs/person-picker.tsx:42` shows 8.
- [ ] `LinkedText` lives in `src/features/technologies/`, its one caller's feature. Today it
      is `src/components/linked-text.tsx`.
- [ ] `docs/architecture.md`, "Repository layout", says `ui/dialog.tsx` carries the app's
      discard guard. Today it says `ui/` holds shadcn copies only (`:55`).
- [ ] Task 054's or 050's Outcome records whether the user accepts the projects page's
      1,021 DOM nodes (`perf/baselines/pages.json:7`), above task 054's target of 1,000.
      Today task 054's ticked criterion still says 968.
- [ ] Task 039's rehearsal criterion asks for the real sheet's characteristic answers that
      read as yes without starting with "Ja" or "Yes", as cr-004 proposed. Today
      `tasks/039-sheet-migration/README.md:28` doesn't.
