# 042.2: A warning when adding or renaming

Status: todo
Depends on: task 042.1 (the rule)

Adding a technology, from the page or a picker, or renaming one, to a near-duplicate of a
live entry (task 042, decision 1) warns and names the existing entry; "Add anyway" still
adds it. A pair marked "Not a duplicate" doesn't warn.

## Acceptance criteria

- [ ] The add dialog and the edit dialog warn and name the existing entry, as the
      prototype's `duplicate` state shows, with "Add anyway" (or "Save anyway") to go on.
- [ ] Component tests cover the warning, going on anyway, and a name with no near
      duplicate.

## Spec changes

- Added: scenario `technology-catalogue.near-duplicate-warned` under "Near-duplicates are
  suggested" in `docs/specs/technology-catalogue.md`.
