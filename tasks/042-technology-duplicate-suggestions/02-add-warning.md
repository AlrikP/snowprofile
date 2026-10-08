    # 042.2: A warning when adding or renaming

Status: done
Depends on: task 042.1 (the rule)

Adding a technology, from the page or a picker, or renaming one, to a near-duplicate of a
live entry (task 042, decision 1) warns and names the existing entry; "Add anyway" still
adds it. A pair marked "Not a duplicate" doesn't warn.

## Acceptance criteria

- [x] The add dialog and the edit dialog warn and name the existing entry, as the
      prototype's `duplicate` state shows, with "Add anyway" (or "Save anyway") to go on.
- [x] Component tests cover the warning, going on anyway, and a name with no near
      duplicate.

## Spec changes

- Added: scenario `technology-catalogue.near-duplicate-warned` under "Near-duplicates are
  suggested" in `docs/specs/technology-catalogue.md`.

## Outcome

- `nearDuplicateOf` in `src/lib/technology-duplicates.ts` finds the entry a name nearly
  duplicates; both dialogs call it only when there is no exact duplicate, which still
  blocks saving. The warning shares the exact duplicate's alert slot, so the name field's
  description names the entry either way.
- The picker opens the same add dialog (`src/components/add-technology-dialog.tsx`), so it
  warns too without its own change.
- The edit dialog warns only when the normalized name changes: Postgres beside PostgreSQL
  would otherwise warn on every category change. It skips a pair marked "Not a
  duplicate"; the add dialog has no ID to match a pair with, so it always warns.
- Found while checking: a name that is only a version ("1", "2") had an empty stem and
  paired with every other such name. Empty stems now pair with nothing.
- The server doesn't check near-duplicates; "Add anyway" sends the same request as Save.
- Checked with unit and component tests and the e2e suite; not in a browser.
