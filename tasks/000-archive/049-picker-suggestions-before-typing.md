# 049: Suggestions in pickers before typing

Status: done

The autocomplete pickers list options only once something is typed: an empty field shows
nothing, so a person can't see what kind of entry the field expects or what the catalogue
holds. Showing some options when the field is focused and still empty would make that
clear.

The pickers with this behavior all build their options from a typed `needle` and show at
most `MAX_OPTIONS` (8):

- `src/components/technology-picker.tsx`: participations, own projects, projects, and
  search.
- `src/components/role-picker.tsx`: participations, own projects, and search.
- `src/features/cvs/person-picker.tsx`: the CV page's people.

The customer field on the project form is a native select, so it already lists every
customer.

## Options to discuss

- **What to show:** the most used entries (the role catalogue already returns `uses`, and
  the technology catalogue project and people counts), the alphabetically first ones,
  entries grouped by category, or, for people, everyone in name order.
- **Where it depends on context:** a participation's technology picker could start with
  the project's technologies, the ones it doesn't have yet (the "Also on the project"
  suggestions do this today, below the picker). A participation's role picker could start
  with the person's own most used roles.
- **When to open:** on focus, on click, or only on the arrow-down key, and whether
  Escape and a click outside close it again.
- **How many:** the same 8, or a scrollable list of the whole catalogue, which for roles
  and people is short enough to browse.
- **Accessibility:** the combobox pattern with an empty input (`aria-expanded`, the active
  option, screen reader announcements), checked the way `docs/skills/ui-review/` describes.
- **Shared code:** the three pickers repeat the same combobox logic; a shared hook or
  component could carry the new behavior once.

## Decision

Decided with the user on 2026-10-08:

- **When:** the list opens when the empty field gets focus or a click, and on the down
  arrow. Escape, leaving the field, and a click outside close it.
- **What, 8 at most:** technologies: the IDs the caller suggests first (a participation
  passes its project's technologies), then the entries most projects use. Roles: most
  used first. People: everyone the picker offers, in name order.
- **Shared code:** `useCombobox` (`src/components/use-combobox.ts`) holds the state and
  keys the three pickers repeated; each picker keeps its own options and markup.

## Acceptance criteria

- [x] The chosen behavior, per picker, is agreed and recorded in the task before the work
      starts.
- [x] Each picker shows its suggestions on an empty field as agreed, and typing narrows
      them as now.
- [x] Keyboard use works the same with an empty field as with a typed one.
- [x] Component tests cover the empty-field suggestions for each picker.

## Spec changes

- Added: requirement "Pickers suggest before typing" with scenario
  `technology-catalogue.picker-suggests` in `docs/specs/technology-catalogue.md`, and with
  `role-catalogue.picker-suggests` in `docs/specs/role-catalogue.md`.
- Modified: "Leavers on request" in `docs/specs/cv-selection.md` says the empty field
  suggests everyone offered, in name order. Added scenario `cv-selection.people-suggested`.

## Outcome

- A new participation starts with all of its project's technologies chosen, so its
  picker suggests the project's other technologies only after the person removes some.
  The "Also on the project" buttons under the picker stay.
- Escape in a picker inside a dialog closes the list and leaves the dialog open, checked
  in Chromium. Near the bottom of a dialog the list runs past the visible area and the
  dialog scrolls, as it already did while typing.
- The person picker now sorts by name while typing too.
- Not tried with a screen reader. The input keeps the combobox attributes it had, and
  `aria-expanded` now follows the open list.
