# CR-005.3: Docs, a scenario test, and plans

Status: done

The specs, docs, and open plans match the code, and the `own-copy` tests check something
(`review.md`, findings 3 and 4).

## Acceptance criteria

- [x] `project-participation.own-copy` no longer says the member picks another project,
      and no test cites it for a project change. Today the scenario says so
      (`docs/specs/project-participation.md:139`), and the component test at
      `src/features/profile/profile-page.test.tsx:627` selects an option on a disabled
      select, which changes nothing, so it passes whatever the form does.
- [x] `docs/specs/cv-selection.md` says the empty people field suggests the first 8 people
      in name order. Today it says "everyone it offers" (`:39`), and
      `src/features/cvs/person-picker.tsx:42` shows 8.
- [x] `LinkedText` lives in `src/features/technologies/`, its one caller's feature. Today it
      is `src/components/linked-text.tsx`.
- [x] `docs/architecture.md`, "Repository layout", says `ui/dialog.tsx` carries the app's
      discard guard. Today it says `ui/` holds shadcn copies only (`:55`).
- [x] Task 054's or 050's Outcome records whether the user accepts the projects page's
      1,021 DOM nodes (`perf/baselines/pages.json:7`), above task 054's target of 1,000.
      Today task 054's ticked criterion still says 968.
- [x] Task 039's rehearsal criterion asks for the real sheet's characteristic answers that
      read as yes without starting with "Ja" or "Yes", as cr-004 proposed. Today
      `tasks/039-sheet-migration/README.md:28` doesn't.

## Outcome

- `project-participation.own-copy` now covers only the admin changing the project's
  technologies. The vacuous component test is gone; `participations.test.ts` still cites
  the scenario, and task 043's `project-kept` test covers the read-only project.
- `LinkedText` moved to `src/features/technologies/linked-text.tsx`.
- `docs/architecture.md` says, after the layout table, that `ui/dialog.tsx` holds the
  discard guard and that a shadcn update is merged into it by hand.
- The user accepted the projects page's 1,021 DOM nodes on 2026-10-08; tasks 050 and 054
  record it.
- Task 039 has a new rehearsal criterion for answers that read as yes but mean no.
