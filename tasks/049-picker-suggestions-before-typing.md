# 049: Suggestions in pickers before typing

Status: todo

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

## Acceptance criteria

- [ ] The chosen behavior, per picker, is agreed and recorded in the task before the work
      starts.
- [ ] Each picker shows its suggestions on an empty field as agreed, and typing narrows
      them as now.
- [ ] Keyboard use works the same with an empty field as with a typed one.
- [ ] Component tests cover the empty-field suggestions for each picker.

## Spec changes

To decide with the behavior; likely a scenario per catalogue spec
(`technology-catalogue.md`, `role-catalogue.md`) and in `cv-selection.md` for people.
