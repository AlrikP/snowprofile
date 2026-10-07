# 045: Check a participation's period against the project's

Status: done

Neither the participation form nor the server compares a participation's period with its
project's. A member can save a participation on a project that ran 2022–2023 with the
period 2019–2025, and the CV then shows it. `participationValues` in
`src/server/profiles/participations.server.ts` checks that the project, roles, and
technologies are live, but not the dates.

Task 044 shows the project's period in the form.

## Decisions

Decided with the user, recorded in `docs/product.md`, "Participation periods":

1. A participation's period outside its project's is refused, in the form and on the
   server. Each pair of dates compares at the coarser precision, so a 2024 start fits a
   2024-03 project start. An ongoing project has no end limit.
2. A new or changed participation can't be ongoing on a project that has ended. An ongoing
   participation saved before the project ended reads as ending on the project's end,
   although its stored end stays empty.
3. An admin's change to the project's period is accepted, and existing participations
   stay as they are until their owner edits them; the rule then applies.

## Subtasks

- 045.1: Refuse a participation period outside the project's
  (`01-refuse-outside-period.md`)
- 045.2: Read an ongoing participation on an ended project as ending with it
  (`02-ongoing-ends-with-project.md`)

## Outcome

- Both subtasks are done; their Outcome sections hold the details.
- Company data outside its project's period wasn't counted, because no copy is available
  locally (045.1). Count it once the sheet migration (task 039) has run.
